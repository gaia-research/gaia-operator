import { PlaywrightAdapter } from "../../adapters/browser/playwright-adapter.js";
import { OperatorTask, Finding } from "../../core/types.js";
import { TraceRecorder } from "../../core/trace-recorder.js";

export class GenericBrowserHarness {
  private browserAdapter: PlaywrightAdapter;

  constructor(browserAdapter: PlaywrightAdapter) {
    this.browserAdapter = browserAdapter;
  }

  async execute(
    task: OperatorTask,
    traceRecorder: TraceRecorder,
    screenshotDir?: string
  ): Promise<{ findings: Finding[]; reportContent: string }> {
    const urls = task.queries || [];
    const findings: Finding[] = [];

    traceRecorder.recordStep(
      "generic_browser_start",
      "generic",
      "L0",
      { urls },
      { message: `Starting observation of ${urls.length} target URLs` }
    );

    for (const url of urls) {
      try {
        const result = await this.browserAdapter.navigate(url, screenshotDir);
        traceRecorder.recordStep(
          "generic_browser_navigate",
          "generic",
          "L0",
          { url },
          { title: result.title, hasScreenshot: !!result.screenshotPath }
        );

        findings.push({
          id: `finding_generic_${Date.now()}`,
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

    const reportContent = `# Generic Browser Report: ${task.title}\n\nProcessed URLs:\n` + urls.map(u => `- ${u}`).join("\n");
    return { findings, reportContent };
  }
}
