import { Trace, TraceStep, PlatformName, RiskLevel } from "./types.js";
import { RISK_VALUES } from "../policies/action-risk.js";
import { PolicyViolationError } from "./errors.js";

export class TraceRecorder {
  private trace: Trace;
  private stepCounter = 1;
  private riskCeiling: RiskLevel;

  constructor(taskId: string, riskCeiling: RiskLevel) {
    this.riskCeiling = riskCeiling;
    this.trace = {
      task_id: taskId,
      status: "pending",
      risk_ceiling_used: riskCeiling,
      public_actions_taken: 0,
      approval_required: false,
      steps: [],
      created_at: new Date().toISOString()
    };
  }

  start(): void {
    this.trace.status = "running";
  }

  recordStep(
    action: string,
    platform: PlatformName | undefined,
    riskLevel: RiskLevel,
    input: Record<string, any>,
    output: Record<string, any>
  ): void {
    // Adapters and harnesses may narrow capability, never widen it. L0/L1 are
    // read-only/local processing; any step at L2 or above must sit within the
    // task's declared ceiling, and L5 is never recordable as performed.
    if (
      riskLevel === "L5" ||
      (RISK_VALUES[riskLevel] >= RISK_VALUES.L2 && RISK_VALUES[riskLevel] > RISK_VALUES[this.riskCeiling])
    ) {
      throw new PolicyViolationError(
        `Step '${action}' at ${riskLevel} exceeds the task risk ceiling ${this.riskCeiling}; adapters may not upgrade a task's declared risk level.`,
        riskLevel,
        action
      );
    }

    const step: TraceStep = {
      step_id: `step_${String(this.stepCounter++).padStart(3, "0")}`,
      action,
      platform,
      risk_level: riskLevel,
      input,
      output,
      timestamp: new Date().toISOString()
    };
    this.trace.steps.push(step);
    
    // Count public writes
    if (riskLevel === "L4") {
      this.trace.public_actions_taken++;
    }
  }

  /**
   * Record that a capability above the ceiling was requested and refused.
   * Stored at L0 with the requested level in the output, so it neither counts
   * as a public action nor trips the ceiling guard.
   */
  recordRefusal(
    action: string,
    platform: PlatformName | undefined,
    requestedLevel: RiskLevel,
    input: Record<string, any>,
    reason: string
  ): void {
    this.recordStep(action, platform, "L0", input, { refused: true, requested_risk_level: requestedLevel, reason });
  }

  setApprovalRequired(): void {
    this.trace.approval_required = true;
  }

  complete(): void {
    this.trace.status = "completed";
    this.trace.completed_at = new Date().toISOString();
  }

  fail(error: string): void {
    this.trace.status = "failed";
    this.trace.error = error;
    this.trace.completed_at = new Date().toISOString();
  }

  block(reason: string): void {
    this.trace.status = "blocked";
    this.trace.error = reason;
    this.trace.completed_at = new Date().toISOString();
  }

  getTrace(): Trace {
    return this.trace;
  }
}
