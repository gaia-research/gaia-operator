import { Trace, TraceStep, PlatformName, RiskLevel } from "./types.js";

export class TraceRecorder {
  private trace: Trace;
  private stepCounter = 1;

  constructor(taskId: string, riskCeiling: RiskLevel) {
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
