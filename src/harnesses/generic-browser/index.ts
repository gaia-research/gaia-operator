import { PlaywrightAdapter } from "../../adapters/browser/playwright-adapter.js";
import { OperatorTask, Finding, BlockedState } from "../../core/types.js";
import { TraceRecorder } from "../../core/trace-recorder.js";
import { BlockDetector } from "../../core/block-detector.js";
import { checkNavigableUrl } from "../../policies/url-policy.js";
import { PrivacyChecker } from "../../policies/privacy.js";

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
        const block = BlockDetector.detectBlock(task.id, platform, result.content ?? "", url, ["login"]);
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
        traceRecorder.recordStep(
          "generic_browser_failed",
          "generic",
          "L0",
          { url },
          { error: err.message }
        );
      }
    }

    let reportContent = `# Generic Browser Report: ${task.title}\n\nProcessed URLs:\n` + urls.filter(u => !skipped.includes(u)).map(u => `- ${u}`).join("\n");
    if (skipped.length > 0) {
      reportContent += `\n\nRefused URLs (not opened):\n` + skipped.map(u => `- ${u}`).join("\n");
    }
    if (blockedState) {
      reportContent += `\n\nRun stopped: ${blockedState.description}`;
    }
    return { findings, reportContent, blockedState };
  }
}
