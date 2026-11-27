import { PlaywrightAdapter } from "../../adapters/browser/playwright-adapter.js";
import { OperatorTask, Finding, BlockedState } from "../../core/types.js";
import { TraceRecorder } from "../../core/trace-recorder.js";
import { BlockDetector } from "../../core/block-detector.js";
import { checkNavigableUrl } from "../../policies/url-policy.js";
import { PrivacyChecker } from "../../policies/privacy.js";

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

// Challenge widgets are markup, not text; detect their containers explicitly.
const CHALLENGE_MARKUP = /class\s*=\s*["'][^"']*\b(g-recaptcha|h-captcha|cf-turnstile)\b|<iframe[^>]+(recaptcha\/api2\/anchor|hcaptcha\.com\/captcha|challenges\.cloudflare\.com)/i;

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
    const urls = task.queries || [];
    const findings: Finding[] = [];
    const skipped: string[] = [];
    const visited: string[] = [];
    const failed: string[] = [];
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
        : !PrivacyChecker.isPublicContentAllowed(url)
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

        // Page content is data. If it shows a CAPTCHA, rate limit or account
        // warning, stop the whole run rather than continue. The shared login
        // heuristic matches any "sign in" link, which nearly every public page
        // carries, so generic observation does not stop on it: this harness
        // never submits credentials or interacts with the page.
        visited.push(url);
        const html = result.content ?? "";
        const block =
          BlockDetector.detectBlock(task.id, platform, visibleText(html), url, ["login"]) ??
          (CHALLENGE_MARKUP.test(html)
            ? BlockDetector.detectBlock(task.id, platform, "captcha", url, ["login"])
            : null);
        if (block) {
          if (result.screenshotPath) {
            block.evidence_refs.push(result.screenshotPath);
          }
          blockedState = block;
          traceRecorder.recordStep(
            "generic_browser_blocked",
            "generic",
            "L0",
            { url },
            { blockType: block.block_type }
          );
          break;
        }

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

    const notVisited = urls.filter((u) => !visited.includes(u) && !skipped.includes(u) && !failed.includes(u));
    const section = (heading: string, list: string[]) =>
      list.length > 0 ? `\n\n${heading}:\n` + list.map((u) => `- ${u}`).join("\n") : "";

    let reportContent = `# Generic Browser Report: ${task.title}`;
    reportContent += section("Observed URLs", visited.filter((u) => !failed.includes(u)));
    reportContent += section("Failed to load", failed);
    reportContent += section("Refused URLs (not opened)", skipped);
    reportContent += section("Not visited (run stopped)", notVisited);
    if (blockedState) {
      reportContent += `\n\nRun stopped: ${blockedState.description}`;
    }
    return { findings, reportContent, blockedState };
  }
}
