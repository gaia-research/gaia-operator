import { RiskLevel } from "./types.js";

export class ApprovalGates {
  private requireApprovalL3: boolean;
  private requireApprovalL4: boolean;

  constructor(requireApprovalL3 = true, requireApprovalL4 = true) {
    this.requireApprovalL3 = requireApprovalL3;
    this.requireApprovalL4 = requireApprovalL4;
  }

  isApprovalRequired(riskLevel: RiskLevel): boolean {
    if (riskLevel === "L4" || riskLevel === "L5") {
      return this.requireApprovalL4;
    }
    if (riskLevel === "L3") {
      return this.requireApprovalL3;
    }
    return false;
  }
}
