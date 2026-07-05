import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { 
  MobileHandoffTaskSchema, 
  MobileHandoffTask, 
  checkGuardrails, 
  generateDraft, 
  loadRefFile 
} from "./prepare.js";

export { 
  MobileHandoffTaskSchema, 
  MobileHandoffTask, 
  checkGuardrails, 
  generateDraft, 
  loadRefFile 
};
import { generateHandoffCard, generateBlockedCard } from "./approval-card.js";
import { MobileHandoffAdapter } from "../../adapters/mobile/mobile-handoff.js";

export interface HandoffRunResult {
  success: boolean;
  message: string;
  violations?: string[];
  taskId: string;
}

export class MobileHandoffHarness {
  /**
   * Helper to write a file to both locations to satisfy different sections of the PRD.
   */
  private static writeToArtifactDirs(taskId: string, fileName: string, content: string): void {
    const paths = [
      path.resolve(process.cwd(), ".gaia-operator", "mobile", "handoffs", taskId, fileName),
      path.resolve(process.cwd(), "artifacts", "mobile-handoff", taskId, fileName)
    ];

    for (const p of paths) {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(p, content, "utf-8");
    }
  }

  /**
   * Reads task file and validates against schema.
   */
  static loadTask(taskFilePath: string): MobileHandoffTask {
    const absolutePath = path.resolve(process.cwd(), taskFilePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Task file not found at: ${absolutePath}`);
    }

    const content = fs.readFileSync(absolutePath, "utf-8");
    const parsed = yaml.load(content);
    
    const result = MobileHandoffTaskSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`Task schema validation failed: ${result.error.errors.map((e: any) => `${e.path.join(".")}: ${e.message}`).join("; ")}`);
    }

    return result.data;
  }

  /**
   * Validates a task YAML and returns the guardrail check results.
   */
  static validate(taskFilePath: string): { success: boolean; message: string; violations?: string[] } {
    try {
      const task = this.loadTask(taskFilePath);
      
      // Load optional voice files if specified to generate draft for guardrail check
      const taskDir = path.dirname(path.resolve(process.cwd(), taskFilePath));
      const personaContent = task.voice?.persona_ref ? loadRefFile(task.voice.persona_ref, taskDir) : undefined;
      const soulContent = task.voice?.soul_ref ? loadRefFile(task.voice.soul_ref, taskDir) : undefined;
      
      const draftText = generateDraft(task, personaContent, soulContent);
      const guardrailResult = checkGuardrails(task, draftText);

      if (!guardrailResult.passed) {
        return {
          success: false,
          message: "Guardrail checks failed.",
          violations: guardrailResult.violations
        };
      }

      return {
        success: true,
        message: "Task is valid and passes guardrails."
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message
      };
    }
  }

  /**
   * Prepares the task: drafts response, runs guardrails, and writes artifacts.
   */
  static prepare(taskFilePath: string): HandoffRunResult {
    const rawTaskContent = fs.readFileSync(path.resolve(process.cwd(), taskFilePath), "utf-8");
    let task: MobileHandoffTask;
    try {
      task = this.loadTask(taskFilePath);
    } catch (err: any) {
      return { success: false, message: `Task loading failed: ${err.message}`, taskId: "unknown" };
    }

    const taskDir = path.dirname(path.resolve(process.cwd(), taskFilePath));
    const personaContent = task.voice?.persona_ref ? loadRefFile(task.voice.persona_ref, taskDir) : undefined;
    const soulContent = task.voice?.soul_ref ? loadRefFile(task.voice.soul_ref, taskDir) : undefined;

    const draftText = generateDraft(task, personaContent, soulContent);
    const guardrailResult = checkGuardrails(task, draftText);

    // Save target metadata
    const targetJson = JSON.stringify({
      url: task.target.url,
      community: task.target.community || "",
      context_summary: task.target.context_summary || ""
    }, null, 2);
    this.writeToArtifactDirs(task.id, "target.json", targetJson);

    // Save task yaml file copy
    this.writeToArtifactDirs(task.id, "task.yaml", rawTaskContent);

    if (!guardrailResult.passed) {
      // Write blocked artifacts
      const blockedCard = generateBlockedCard(task, guardrailResult.violations);
      this.writeToArtifactDirs(task.id, "blocked-handoff.md", blockedCard);
      this.writeToArtifactDirs(task.id, "guardrail-check.md", `FAILED\n\nViolations:\n${guardrailResult.violations.join("\n")}`);
      
      // Write trace
      const tracePayload = this.buildTrace(task, "blocked", "Guardrails failed. Handoff blocked.", draftText, guardrailResult.violations);
      this.writeToArtifactDirs(task.id, "trace.json", JSON.stringify(tracePayload, null, 2));

      return {
        success: false,
        message: "Guardrail check failed. Blocked card written to artifacts.",
        violations: guardrailResult.violations,
        taskId: task.id
      };
    }

    // Guardrails passed - write success artifacts
    const handoffCard = generateHandoffCard(task, draftText);
    this.writeToArtifactDirs(task.id, "handoff-card.md", handoffCard);
    this.writeToArtifactDirs(task.id, "draft.txt", draftText);
    this.writeToArtifactDirs(task.id, "guardrail-check.md", "PASSED\n\nAll security and spam validation rules passed.");

    const tracePayload = this.buildTrace(task, "completed", "Task prepared and verified.", draftText);
    this.writeToArtifactDirs(task.id, "trace.json", JSON.stringify(tracePayload, null, 2));

    return {
      success: true,
      message: "Handoff task prepared successfully.",
      taskId: task.id
    };
  }

  /**
   * Executes the handoff: loads artifacts (or prepares if missing), executes Termux handoff.
   */
  static handoff(taskFilePath: string): HandoffRunResult {
    let task: MobileHandoffTask;
    try {
      task = this.loadTask(taskFilePath);
    } catch (err: any) {
      return { success: false, message: `Task loading failed: ${err.message}`, taskId: "unknown" };
    }

    const taskDir = path.dirname(path.resolve(process.cwd(), taskFilePath));
    
    // Check if task is already prepared, if not, prepare it.
    const artifactsDir = path.resolve(process.cwd(), "artifacts", "mobile-handoff", task.id);
    const draftPath = path.join(artifactsDir, "draft.txt");
    const checkPath = path.join(artifactsDir, "guardrail-check.md");

    let prepared = fs.existsSync(draftPath) && fs.existsSync(checkPath);
    if (!prepared) {
      const prepRes = this.prepare(taskFilePath);
      if (!prepRes.success) {
        return prepRes;
      }
    } else {
      // Verify guardrails didn't fail
      const guardrailStatus = fs.readFileSync(checkPath, "utf-8");
      if (guardrailStatus.includes("FAILED")) {
        return {
          success: false,
          message: "Cannot run handoff: prepared state is blocked by guardrails.",
          taskId: task.id
        };
      }
    }

    // Read draft
    const draftText = fs.readFileSync(draftPath, "utf-8");

    // Execute actual Termux / Intent flow
    const handoffResult = MobileHandoffAdapter.execute({
      draftText,
      targetUrl: task.target.url,
      notificationTitle: `Gaia Handoff: ${task.platform.toUpperCase()}`,
      notificationContent: `Draft copied. Review ${task.target.community || "thread"} before posting.`,
      taskId: task.id,
      sharePayload: task.constraints.share_payload === true // share draft text using share sheets if enabled
    });

    // Write outcome status matching Output Contract (Section 10)
    const resultPayload = {
      task_id: task.id,
      status: "handoff_ready",
      platform: task.platform,
      target_url: task.target.url,
      draft_path: `artifacts/mobile-handoff/${task.id}/draft.txt`,
      clipboard_written: handoffResult.clipboardWritten,
      url_opened: handoffResult.urlOpened,
      notification_sent: handoffResult.notificationSent,
      public_action_taken_by_agent: false,
      manual_action_required: true
    };
    
    // Write result.json initially
    this.writeToArtifactDirs(task.id, "result.json", JSON.stringify(resultPayload, null, 2));

    // Update trace
    const tracePayload = this.buildTrace(task, "completed", "Handoff executed successfully.", draftText, undefined, handoffResult);
    this.writeToArtifactDirs(task.id, "trace.json", JSON.stringify(tracePayload, null, 2));

    return {
      success: true,
      message: `Handoff executed: URL opened = ${handoffResult.urlOpened}, Clipboard set = ${handoffResult.clipboardWritten}, Notification sent = ${handoffResult.notificationSent}`,
      taskId: task.id
    };
  }

  /**
   * Helper to build a trace object compliant with Gaia core specifications.
   */
  private static buildTrace(
    task: MobileHandoffTask, 
    status: "pending" | "running" | "completed" | "failed" | "blocked", 
    message: string, 
    draftText: string,
    violations?: string[],
    handoffDetails?: any
  ) {
    const step: any = {
      step_id: `step_${Date.now()}`,
      action: "mobile_handoff_prepare",
      platform: task.platform,
      risk_level: task.risk_ceiling,
      input: {
        task_id: task.id,
        target_url: task.target.url,
        constraints: task.constraints
      },
      output: {
        message,
        draft_length: draftText.length,
        violations: violations || []
      },
      timestamp: new Date().toISOString()
    };

    if (handoffDetails) {
      step.action = "mobile_handoff_execute";
      step.output = {
        ...step.output,
        ...handoffDetails
      };
    }

    return {
      task_id: task.id,
      status,
      risk_ceiling_used: task.risk_ceiling,
      public_actions_taken: 0, // always 0 for MVP
      approval_required: true,
      steps: [step],
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    };
  }
}
