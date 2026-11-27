import { PlaywrightAdapter } from "../../adapters/browser/playwright-adapter.js";
import { OperatorTask, Finding, BlockedState } from "../../core/types.js";
import { TraceRecorder } from "../../core/trace-recorder.js";
import { BlockDetector } from "../../core/block-detector.js";
import { checkNavigableUrl, isPrivateAccountUrl } from "../../policies/url-policy.js";
import { inlineText } from "../../core/safe-text.js";

/**
 * Visible text only: script/style bodies, tags and attributes (asset hashes,
 * an embedded reCAPTCHA script URL) must not trip stop conditions meant for
 * what the page actually shows.
 */
export function visibleText(html: string): string {
  return html
    .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ");
}

// Generic observation visits arbitrary public pages, where words such as
// "captcha", "rate limit" or "banned" are ordinary article content. Stop only
// on structural signals: a challenge widget in the markup, or a challenge /
// 429 interstitial phrase in the title or visible text.
const CHALLENGE_MARKUP = /class\s*=\s*["'][^"']*\b(g-recaptcha|h-captcha|cf-turnstile)\b|<iframe[^>]+(recaptcha\/api2\/anchor|hcaptcha\.com\/captcha|challenges\.cloudflare\.com)|\/cdn-cgi\/challenge-platform\/|id\s*=\s*["']challenge-(stage|form|running)["']/i;
const CHALLENGE_PHRASES = /\b(verify(ing)? you are (a )?human|please complete the security check|are you a robot|checking your browser before accessing|attention required!? \| cloudflare)\b|^\s*just a moment\.\.\./i;
const RATE_LIMIT_PHRASES = /\b(too many requests|(?:http|error|status)\s*:?\s*429)\b/i;

export function detectGenericBlock(
  html: string,
  title: string
): { blockType: BlockedState["block_type"]; description: string } | null {
  // Interstitials say so up front; an article that mentions "HTTP 429" or
  // "verify you are a human" further down is content, not a block.
  const text = `${title} ${visibleText(html).trim().slice(0, 300)}`;
  if (CHALLENGE_MARKUP.test(html) || CHALLENGE_PHRASES.test(text)) {
    return { blockType: "captcha", description: "CAPTCHA or human-verification challenge detected." };
  }
  if (RATE_LIMIT_PHRASES.test(text)) {
    return { blockType: "rate_limit", description: "Rate-limit (429) page detected." };
  }
  return null;
}

type NavigatingAdapter = Pick<PlaywrightAdapter, "navigate">;

export class GenericBrowserHarness {
  private browserAdapter: NavigatingAdapter;

  constructor(browserAdapter: NavigatingAdapter) {
    this.browserAdapter = browserAdapter;
  }

  async execute(
    task: OperatorTask,
    traceRecorder: TraceRecorder,
    screenshotDir?: string
  ): Promise<{ findings: Finding[]; reportContent: string; blockedState?: BlockedState }> {
    // De-duplicate so per-URL outcomes in the report are unambiguous.
    const urls = [...new Set(task.queries || [])];
    const findings: Finding[] = [];
    const skipped: string[] = [];
    const visited: string[] = [];
    const failed: string[] = [];
    let stoppedAt: string | undefined;
    let blockedState: BlockedState | undefined;
    const platform = task.platforms[0] ?? "generic";

    traceRecorder.recordStep(
      "generic_browser_start",
      "generic",
      "L0",
      { urls },
      { message: `Starting observation of ${urls.length} target URLs` }
    );

    for (const url of urls) {
      // Only public http(s) pages are observed. file:, javascript:, data:,
      // credential-bearing and private/inbox/settings URLs are refused before
      // the adapter is touched.
      const navigable = checkNavigableUrl(url);
      const reason = !navigable.ok
        ? navigable.reason
        : isPrivateAccountUrl(url)
          ? "URL points at private/account content and is out of scope."
          : undefined;
      if (reason) {
        skipped.push(url);
        traceRecorder.recordStep(
          "generic_browser_url_refused",
          "generic",
          "L0",
          { url },
          { refused: true, reason }
        );
        continue;
      }

      try {
        const result = await this.browserAdapter.navigate(url, screenshotDir);

        // Page content is data. A challenge or rate-limit interstitial stops
        // the whole run rather than continuing to other URLs.
        const detected = detectGenericBlock(result.content ?? "", result.title ?? "");
        const block = detected
          ? BlockDetector.forType(task.id, platform, detected.blockType, detected.description, url)
          : null;
        if (block) {
          if (result.screenshotPath) {
            block.evidence_refs.push(result.screenshotPath);
          }
          blockedState = block;
          stoppedAt = url;
          traceRecorder.recordStep(
            "generic_browser_blocked",
            "generic",
            "L0",
            { url },
            { blockType: block.block_type }
          );
          break;
        }

        visited.push(url);
        traceRecorder.recordStep(
          "generic_browser_navigate",
          "generic",
          "L0",
          { url },
          { title: result.title, hasScreenshot: !!result.screenshotPath }
        );

        findings.push({
          id: `finding_generic_${findings.length + 1}_${Date.now()}`,
          task_id: task.id,
          platform: "generic",
          url,
          title: result.title,
          summary: `Successfully navigated and inspected: ${result.title}`,
          relevance_score: 1.0,
          interaction_risk: "low",
          recommended_action: "observe",
          evidence_refs: result.screenshotPath ? [result.screenshotPath] : []
        });
      } catch (err: any) {
        failed.push(url);
        traceRecorder.recordStep(
          "generic_browser_failed",
          "generic",
          "L0",
          { url },
          { error: err.message }
        );
      }
    }

    const notVisited = urls.filter((u) => !visited.includes(u) && !skipped.includes(u) && !failed.includes(u) && u !== stoppedAt);
    const section = (heading: string, list: string[]) =>
      list.length > 0 ? `\n\n${heading}:\n` + list.map((u) => `- ${inlineText(u)}`).join("\n") : "";

    let reportContent = `# Generic Browser Report: ${inlineText(task.title)}`;
    reportContent += section("Observed URLs", visited);
    reportContent += section("Stopped at (challenge or rate limit, not observed)", stoppedAt ? [stoppedAt] : []);
    reportContent += section("Failed to load", failed);
    reportContent += section("Refused URLs (not opened)", skipped);
    reportContent += section("Not visited (run stopped)", notVisited);
    if (blockedState) {
      reportContent += `\n\nRun stopped: ${inlineText(blockedState.description)}`;
    }
    return { findings, reportContent, blockedState };
  }
}
