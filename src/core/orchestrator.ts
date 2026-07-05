import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import { OperatorTask, ResultSummary, Finding, InteractionOpportunity, BlockedState } from "./types.js";
import { StateStore } from "./state-store.js";
import { ArtifactWriter } from "./artifact-writer.js";
import { TraceRecorder } from "./trace-recorder.js";
import { PolicyEngine } from "./policy-engine.js";
import { PlaywrightAdapter } from "../adapters/browser/playwright-adapter.js";
import { MarketingTasksAdapter } from "../adapters/filesystem/marketing-tasks-adapter.js";
import { RedditResearchHarness } from "../harnesses/reddit-research/index.js";
import { GenericBrowserHarness } from "../harnesses/generic-browser/index.js";
import { ApprovalGates } from "./approval-gates.js";
import { BlockedSessionError, PolicyViolationError } from "./errors.js";

dotenv.config();

export class Orchestrator {
  private store: StateStore;
  private writer: ArtifactWriter;
  private marketingAdapter: MarketingTasksAdapter;
  private policyEngine: PolicyEngine;
  private approvalGates: ApprovalGates;

  constructor() {
    this.store = new StateStore();
    this.writer = new ArtifactWriter(this.store);
    this.marketingAdapter = new MarketingTasksAdapter();

    const enablePublicWrite = process.env.ENABLE_PUBLIC_WRITE === "true";
    this.policyEngine = new PolicyEngine(enablePublicWrite);

    const reqL3 = process.env.REQUIRE_APPROVAL_FOR_L3 !== "false";
    const reqL4 = process.env.REQUIRE_APPROVAL_FOR_L4 !== "false";
    this.approvalGates = new ApprovalGates(reqL3, reqL4);
  }

  async runTask(taskFile: string): Promise<ResultSummary> {
    // 1. Load the task
    const task = this.marketingAdapter.loadTask(taskFile);
    console.log(`[Orchestrator] Loaded task '${task.id}': "${task.title}"`);

    const recorder = new TraceRecorder(task.id, task.risk_ceiling);
    recorder.start();

    // 2. Validate policies
    try {
      this.policyEngine.validateTaskPolicies(task);
      recorder.recordStep(
        "policy_validation",
        undefined,
        "L1",
        { taskId: task.id, riskCeiling: task.risk_ceiling },
        { status: "passed" }
      );
    } catch (err: any) {
      const errorMsg = `Policy validation failed: ${err.message}`;
      console.error(`[Orchestrator] ${errorMsg}`);
      recorder.fail(errorMsg);
      const result: ResultSummary = {
        task_id: task.id,
        status: "failed",
        risk_ceiling_used: task.risk_ceiling,
        public_actions_taken: 0,
        approval_required: false,
        artifacts: {},
        blocked: false,
        recommended_next_action: "Review task constraints and risk ceiling against platform policies."
      };
      this.writer.writeTrace(task.id, recorder.getTrace());
      this.marketingAdapter.syncResult(task.id, result);
      return result;
    }

    // 3. Setup adapters and execute harness
    const browserAdapter = new PlaywrightAdapter();
    const screenshotDir = path.join(this.store.getArtifactsDir(task.id), "screenshots");
    
    let findings: Finding[] = [];
    let opportunities: InteractionOpportunity[] = [];
    let blockedState: BlockedState | undefined;
    let reportContent = "";
    let status: ResultSummary["status"] = "completed";

    try {
      // Initialize Playwright context
      await browserAdapter.init(true);

      // Route task to harness
      if (task.platforms.includes("reddit")) {
        const redditHarness = new RedditResearchHarness(browserAdapter);
        const res = await redditHarness.execute(task, recorder, screenshotDir);
        findings = res.findings;
        opportunities = res.opportunities;
        blockedState = res.blockedState;
        reportContent = res.reportContent;
      } else {
        // Fallback generic browser observer
        const genericHarness = new GenericBrowserHarness(browserAdapter);
        const res = await genericHarness.execute(task, recorder, screenshotDir);
        findings = res.findings;
        reportContent = res.reportContent;
      }

      if (blockedState) {
        status = "blocked";
        recorder.block(blockedState.description);
      } else {
        recorder.complete();
      }

    } catch (err: any) {
      status = "failed";
      recorder.fail(err.message);
      console.error(`[Orchestrator] Run error: ${err.message}`, err.stack);
      reportContent = `# Task Failed: ${task.title}\n\nError details:\n\`\`\`\n${err.message}\n\`\`\``;
    } finally {
      await browserAdapter.close();
    }

    // Determine approval requirements
    let approvalRequired = false;
    for (const opt of opportunities) {
      if (this.approvalGates.isApprovalRequired(opt.risk_level)) {
        opt.approval_required = true;
        approvalRequired = true;
        recorder.setApprovalRequired();
      }
    }

    // 4. Write artifacts
    const artifacts: ResultSummary["artifacts"] = {};

    if (task.outputs.includes("markdown_report") && reportContent) {
      artifacts.report = this.writer.writeMarkdownReport(task.id, reportContent);
    }
    if (task.outputs.includes("findings_jsonl") && findings.length > 0) {
      artifacts.findings = this.writer.writeFindingsJsonl(task.id, findings);
    }
    if (task.outputs.includes("opportunities_csv") && opportunities.length > 0) {
      artifacts.opportunities = this.writer.writeOpportunitiesCsv(task.id, opportunities);
    }
    if (task.outputs.includes("draft_replies_markdown") && opportunities.length > 0) {
      artifacts.draft_replies = this.writer.writeDraftRepliesMarkdown(task.id, opportunities);
    }
    if (task.outputs.includes("trace_json")) {
      artifacts.trace = this.writer.writeTrace(task.id, recorder.getTrace());
    }
    if (blockedState) {
      artifacts.blocked_state = this.writer.writeBlockedState(task.id, blockedState);
    }
    if (approvalRequired && opportunities.length > 0) {
      artifacts.approval_request = this.writer.writeApprovalRequest(task.id, opportunities);
    }

    // 5. Final Result summary
    const trace = recorder.getTrace();
    const result: ResultSummary = {
      task_id: task.id,
      status,
      risk_ceiling_used: task.risk_ceiling,
      public_actions_taken: trace.public_actions_taken,
      approval_required: approvalRequired,
      artifacts,
      blocked: !!blockedState,
      recommended_next_action: blockedState 
        ? blockedState.recommended_human_action
        : approvalRequired
          ? `Review proposed draft replies in: ${artifacts.approval_request}`
          : "Task completed successfully. No further action needed."
    };

    // 6. Sync back to marketing-tasks
    this.marketingAdapter.syncResult(task.id, result);

    console.log(`[Orchestrator] Completed task '${task.id}' with status '${status}'. Artifacts exported to ${this.store.getArtifactsDir(task.id)}`);
    return result;
  }
}
