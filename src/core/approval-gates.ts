import { RiskLevel } from "./types.js";

/**
 * L4 (public write) and L5 (prohibited) always require per-action human
 * approval. Only the L3 gate is configurable; `requireApprovalL4 = false` is
 * accepted for backwards compatibility but cannot switch the L4 gate off.
 */
export class ApprovalGates {
  private requireApprovalL3: boolean;
  readonly l4OverrideIgnored: boolean;

  constructor(requireApprovalL3 = true, requireApprovalL4 = true) {
    this.requireApprovalL3 = requireApprovalL3;
    this.l4OverrideIgnored = requireApprovalL4 === false;
  }

  isApprovalRequired(riskLevel: RiskLevel): boolean {
    if (riskLevel === "L4" || riskLevel === "L5") {
      return true;
    }
    if (riskLevel === "L3") {
      return this.requireApprovalL3;
    }
    return false;
  }
}
