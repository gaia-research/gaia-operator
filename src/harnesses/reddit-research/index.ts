import * as fs from "fs";
import * as path from "path";
import { OperatorTask, Finding, InteractionOpportunity, BlockedState } from "../../core/types.js";
import { PlaywrightAdapter } from "../../adapters/browser/playwright-adapter.js";
import { RedditApiAdapter } from "../../adapters/reddit/reddit-api-adapter.js";
import { RedditBrowserAdapter } from "../../adapters/reddit/reddit-browser-adapter.js";
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
      { planSteps: plan.map(p => p.name) }
    );

    const queries = task.queries || ["browser agent reddit blocking"];
    const findings: Finding[] = [];
    const opportunities: InteractionOpportunity[] = [];
    let blockedState: BlockedState | undefined;

    // Check voice persona file
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
          { status: "warning", message: "Persona file not found. Falling back to neutral voice." }
        );
      }
    }

    try {
      // 1. Search Reddit threads
      // Try API first, fall back to browser if API fails/returns nothing
      for (const query of queries) {
        let threads = await this.apiAdapter.searchThreads(query);
        traceRecorder.recordStep(
          "api_search",
          "reddit",
          "L0",
          { query },
          { threadCount: threads.length }
        );

        if (threads.length === 0) {
          // Fall back to Playwright browser
          traceRecorder.recordStep(
            "browser_search_fallback_init",
            "reddit",
            "L0",
            { query },
            { message: "API returned no threads, launching browser adapter" }
          );

          const browserAdapter = new RedditBrowserAdapter(this.browserAdapter, task.id);
          threads = await browserAdapter.searchThreads(query, screenshotDir);

          traceRecorder.recordStep(
            "browser_search_fallback_complete",
            "reddit",
            "L0",
            { query },
            { threadCount: threads.length }
          );
        }

        // 2. Score and create findings
        let index = 1;
        for (const t of threads) {
          const relevance = RedditScorer.scoreRelevance(t, queries);
          const risk = RedditScorer.calculateRisk(t);
          const recommendedAction = RedditScorer.determineAction(relevance, risk);

          const finding: Finding = {
            id: `finding_${task.id}_${query.replace(/\s+/g, "_")}_${index++}`,
            task_id: task.id,
            platform: "reddit",
            community: t.subreddit,
            url: t.url,
            title: t.title,
            summary: t.selftext.slice(0, 150) + (t.selftext.length > 150 ? "..." : ""),
            excerpt: t.selftext.slice(0, 300),
            relevance_score: relevance,
            interaction_risk: risk,
            recommended_action: recommendedAction,
            evidence_refs: []
          };

          findings.push(finding);

          // 3. Draft opportunity if needed
          if (
            (task.mode === "research_and_draft" || task.mode === "prepare_interaction") &&
            recommendedAction !== "skip"
          ) {
            const draftReply = this.generateNovaDraft(t, voiceStatus, personaContent);
            const opt: InteractionOpportunity = {
              id: `opportunity_${finding.id}`,
              finding_id: finding.id,
              target_url: t.url,
              community: t.subreddit,
              user_need: t.title,
              suggested_angle: this.getSuggestedAngle(t),
              draft_reply: draftReply,
              nova_voice_status: voiceStatus,
              risk_level: recommendedAction === "approval_required" ? "L3" : "L2",
              approval_required: recommendedAction === "approval_required" || task.constraints.require_approval === true
            };
            opportunities.push(opt);
          }
        }
      }

      // Verify drafts
      const warnings = verifyDrafts(opportunities);
      if (warnings.length > 0) {
        traceRecorder.recordStep(
          "verify_drafts",
          "reddit",
          "L1",
          { opportunitiesCount: opportunities.length },
          { warnings }
        );
      }

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

    // Build Report Content
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

  private getSuggestedAngle(thread: { subreddit: string; title: string }): string {
    const title = thread.title.toLowerCase();
    if (title.includes("captcha") || title.includes("block")) {
      return "Explain that Gaia Operator uses API-first accesses and halts on challenges rather than bypassing them, showing how to implement safe rate budgeting.";
    }
    if (title.includes("mcp")) {
      return "Discuss how using accessibility trees from Playwright MCP is more robust and token-efficient than sending screen images to LLMs.";
    }
    return "Provide a helpful, neutral reply addressing the developer's technical bottleneck directly.";
  }

  private generateNovaDraft(
    thread: { title: string; selftext: string },
    voiceStatus: "applied" | "needs_persona_sync" | "neutral_fallback",
    personaContent: string
  ): string {
    const isMcp = thread.title.toLowerCase().includes("mcp") || thread.selftext.toLowerCase().includes("mcp");
    const isCua = thread.title.toLowerCase().includes("cua") || thread.selftext.toLowerCase().includes("computer use");

    let reply = "";

    if (isMcp) {
      reply = `I have been looking into Model Context Protocol (MCP) servers for browser automation as well. Inspecting the page's accessibility tree instead of relying on raw screenshots or manual coordinates is a game changer for stability. It lets the model make decisions based on structured roles and values rather than visual guessing. In the gaia-operator runtime we use it as a primary browser adapter because it saves tokens and makes step verification much more reliable.`;
    } else if (isCua) {
      reply = `If you're having permission setup failures on macOS with computer-use tasks, the easiest way to debug is by running 'hermes computer-use doctor'. It performs a quick sanity check of your screen recording and accessibility permissions, which are the main culprits when a native driver fails to click or capture.`;
    } else {
      reply = `Reddit's anti-bot measures are quite active. A safe way to operate is to implement an API-first approach, using official endpoints for queries. If a browser is absolutely needed (e.g. to inspect a community's specific rules), make sure rate limits are carefully budgeted and stop execution immediately if a login or CAPTCHA challenge is detected. Evading checks only degrades trust.`;
    }

    if (voiceStatus === "applied") {
      // Nova voice is low-ego, low-promotion, technically grounded.
      // Append a slight style tone adjustment based on loaded persona content.
      reply = `[Nova Voice Applied] ${reply}`;
    }

    return reply;
  }
}
