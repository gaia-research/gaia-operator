import * as fs from "fs";
import * as path from "path";
import { OperatorTask, Finding, InteractionOpportunity, BlockedState } from "../../core/types.js";
import { PlaywrightAdapter } from "../../adapters/browser/playwright-adapter.js";
import { RedditApiAdapter } from "../../adapters/reddit/reddit-api-adapter.js";
import { RedditBrowserAdapter } from "../../adapters/reddit/reddit-browser-adapter.js";
import { RedditThread } from "../../adapters/reddit/reddit-types.js";
import { RedditScorer } from "./scoring.js";
import { buildRedditPlan } from "./plan.js";
import { verifyDrafts } from "./verify.js";
import { RedditRecoveryHandler } from "./recover.js";
import { RedditReportBuilder } from "./report.js";
import { TraceRecorder } from "../../core/trace-recorder.js";
import { BlockedSessionError } from "../../core/errors.js";

export class RedditResearchHarness {
  private browserAdapter: PlaywrightAdapter;
  private apiAdapter: RedditApiAdapter;

  constructor(browserAdapter: PlaywrightAdapter) {
    this.browserAdapter = browserAdapter;
    this.apiAdapter = new RedditApiAdapter();
  }

  async execute(
    task: OperatorTask,
    traceRecorder: TraceRecorder,
    screenshotDir?: string
  ): Promise<{
    findings: Finding[];
    opportunities: InteractionOpportunity[];
    blockedState?: BlockedState;
    reportContent: string;
  }> {
    const plan = buildRedditPlan(task);
    traceRecorder.recordStep(
      "build_plan",
      "reddit",
      "L1",
      { taskMode: task.mode },
      { planSteps: plan.map(p => p.name), publicWritesDisabled: true }
    );

    const queries = task.queries && task.queries.length > 0 ? task.queries : ["browser agent reddit blocking"];
    const findings: Finding[] = [];
    const opportunities: InteractionOpportunity[] = [];
    const seenUrls = new Set<string>();
    let blockedState: BlockedState | undefined;

    let voiceStatus: "applied" | "needs_persona_sync" | "neutral_fallback" = "neutral_fallback";
    let personaContent = "";
    if (task.voice?.persona_ref) {
      const marketingTasksPath = process.env.MARKETING_TASKS_PATH || "../marketing-tasks";
      const fullPersonaPath = path.resolve(process.cwd(), marketingTasksPath, task.voice.persona_ref);

      if (fs.existsSync(fullPersonaPath)) {
        personaContent = fs.readFileSync(fullPersonaPath, "utf-8");
        voiceStatus = "applied";
        traceRecorder.recordStep(
          "load_persona",
          "reddit",
          "L1",
          { personaPath: task.voice.persona_ref },
          { status: "success" }
        );
      } else {
        voiceStatus = "needs_persona_sync";
        traceRecorder.recordStep(
          "load_persona",
          "reddit",
          "L1",
          { personaPath: task.voice.persona_ref },
          { status: "warning", message: "Persona file not found. Falling back to neutral helpful voice." }
        );
      }
    }

    try {
      for (const query of queries) {
        let threads = await this.apiAdapter.searchThreads(query);
        traceRecorder.recordStep(
          "api_search",
          "reddit",
          "L0",
          { query },
          { threadCount: threads.length, source: "reddit_public_json", mockDataUsed: false }
        );

        if (threads.length === 0) {
          traceRecorder.recordStep(
            "browser_search_fallback_init",
            "reddit",
            "L0",
            { query },
            { message: "API returned no threads. Using browser adapter for observation only.", simulation: this.browserAdapter.isMocked() }
          );

          const browserAdapter = new RedditBrowserAdapter(this.browserAdapter, task.id);
          threads = await browserAdapter.searchThreads(query, screenshotDir);

          traceRecorder.recordStep(
            "browser_search_fallback_complete",
            "reddit",
            "L0",
            { query },
            { threadCount: threads.length, source: this.browserAdapter.isMocked() ? "simulated_browser" : "browser", mockDataUsed: this.browserAdapter.isMocked() }
          );
        }

        let index = 1;
        for (const thread of threads) {
          if (seenUrls.has(thread.url)) continue;
          seenUrls.add(thread.url);

          const relevance = RedditScorer.scoreRelevance(thread, queries);
          const risk = RedditScorer.calculateRisk(thread);
          const recommendedAction = RedditScorer.determineAction(relevance, risk);
          const summarySource = thread.selftext.trim() || thread.title;

          const finding: Finding = {
            id: `finding_${this.safeId(task.id)}_${this.safeId(query)}_${index++}`,
            task_id: task.id,
            platform: "reddit",
            community: thread.subreddit,
            url: thread.url,
            title: thread.title,
            summary: summarySource.slice(0, 180) + (summarySource.length > 180 ? "..." : ""),
            excerpt: summarySource.slice(0, 320),
            relevance_score: relevance,
            interaction_risk: risk,
            recommended_action: recommendedAction,
            evidence_refs: [thread.url]
          };

          findings.push(finding);

          if (this.shouldDraft(task, recommendedAction)) {
            const draftReply = this.generateNovaDraft(thread, voiceStatus, personaContent);
            opportunities.push({
              id: `opportunity_${finding.id}`,
              finding_id: finding.id,
              target_url: thread.url,
              community: thread.subreddit,
              user_need: thread.title,
              suggested_angle: this.getSuggestedAngle(thread),
              draft_reply: draftReply,
              nova_voice_status: voiceStatus,
              risk_level: recommendedAction === "approval_required" ? "L3" : "L2",
              approval_required: recommendedAction === "approval_required" || task.constraints.require_approval === true
            });
          }
        }
      }

      if (findings.length === 0) {
        traceRecorder.recordStep(
          "no_findings",
          "reddit",
          "L1",
          { queries },
          { message: "No findings collected. No mock live findings were fabricated." }
        );
      }

      const warnings = verifyDrafts(opportunities);
      traceRecorder.recordStep(
        "verify_drafts",
        "reddit",
        "L1",
        { opportunitiesCount: opportunities.length },
        { warnings }
      );
    } catch (err: any) {
      if (err instanceof BlockedSessionError) {
        blockedState = RedditRecoveryHandler.handleBlock(err);
        blockedState.task_id = task.id;
        traceRecorder.recordStep(
          "handle_block",
          "reddit",
          "L1",
          { error: err.message },
          { blockedState }
        );
      } else {
        throw err;
      }
    }

    const reportContent = RedditReportBuilder.build(
      task,
      findings,
      opportunities,
      blockedState ? blockedState.description : undefined
    );

    return {
      findings,
      opportunities,
      blockedState,
      reportContent
    };
  }

  private shouldDraft(
    task: OperatorTask,
    recommendedAction: "observe" | "draft" | "skip" | "approval_required"
  ): boolean {
    return (
      (task.mode === "research_and_draft" || task.mode === "prepare_interaction") &&
      recommendedAction !== "skip"
    );
  }

  private getSuggestedAngle(thread: Pick<RedditThread, "title" | "subreddit">): string {
    const title = thread.title.toLowerCase();
    if (title.includes("captcha") || title.includes("block")) {
      return "Recommend official/API-first access, lower volume, and stopping on challenges instead of bypassing anti-abuse systems.";
    }
    if (title.includes("mcp")) {
      return "Discuss how structured accessibility snapshots can be more reliable than coordinate clicking or screenshot-only loops.";
    }
    if (title.includes("hermes") || title.includes("cua") || title.includes("computer use")) {
      return "Offer a diagnostic checklist for permissions, visibility, browser state, and explicit fallback boundaries.";
    }
    return "Provide a helpful, neutral reply addressing the developer's technical bottleneck directly.";
  }

  private generateNovaDraft(
    thread: Pick<RedditThread, "title" | "selftext">,
    voiceStatus: "applied" | "needs_persona_sync" | "neutral_fallback",
    _personaContent: string
  ): string {
    const text = `${thread.title} ${thread.selftext}`.toLowerCase();
    const isMcp = text.includes("mcp") || text.includes("model context protocol");
    const isCua = text.includes("cua") || text.includes("computer use") || text.includes("hermes");
    const isBlocked = text.includes("captcha") || text.includes("blocked") || text.includes("rate limit");

    let reply: string;

    if (isMcp) {
      reply = "One practical split that has worked well for browser agents is to use structured browser state first, then screenshots only when visual judgment is truly needed. Accessibility snapshots are usually easier to verify than raw pixels because the agent can reason over roles, labels, links, and inputs instead of guessing coordinates. I would still keep a hard stop for login, CAPTCHA, or rate-limit pages so the browser layer stays boring and auditable.";
    } else if (isCua) {
      reply = "For computer-use setup issues, I would separate the problem into three checks: can the driver see the screen, can it move/click, and is the target window stable and visible? On macOS the usual culprits are Screen Recording and Accessibility permissions, plus running the browser in a session the driver cannot observe. A small doctor command or smoke test before the real task saves a lot of ghost-hunting.";
    } else if (isBlocked) {
      reply = "For Reddit-style blocking, I would avoid trying to make the browser look sneakier. The safer route is official/API-first reads, strict request budgets, and an immediate stop when CAPTCHA, login challenge, or rate-limit screens appear. If a browser is needed, use it for inspection and evidence, not high-volume interaction.";
    } else {
      reply = "I would start by making the workflow less dependent on fragile clicks. Use the most structured interface available first, keep browser steps small and verified, and capture enough evidence that a human can review what happened. The boring version tends to survive longer than the clever version.";
    }

    if (voiceStatus === "needs_persona_sync") {
      return `${reply}\n\nNote for reviewer: Nova persona files were not available in this run, so this is a neutral helpful draft.`;
    }

    return reply;
  }

  private safeId(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);
  }
}
