import { RiskLevel } from "../core/types.js";

export const RISK_VALUES: Record<RiskLevel, number> = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
  L5: 5
};

export function getActionRiskLevel(action: string): RiskLevel {
  const normalized = action.toLowerCase();

  // L5: Prohibited / Sensitive
  if (
    normalized.includes("captcha_solv") ||
    normalized.includes("bypass") ||
    normalized.includes("proxy") ||
    normalized.includes("fingerprint") ||
    normalized.includes("account_creation") ||
    normalized.includes("create_account") ||
    normalized.includes("mass_message") ||
    normalized.includes("mass_dm") ||
    normalized.includes("vote_manipulation") ||
    normalized.includes("scrape_private") ||
    normalized.includes("login_change")
  ) {
    return "L5";
  }

  // L4: Public write / irreversible action
  if (
    normalized.includes("submit") ||
    normalized.includes("publish") ||
    normalized.includes("join") ||
    normalized.includes("follow") ||
    normalized.includes("message_send") ||
    normalized.includes("send_dm") ||
    normalized.includes("send_message") ||
    normalized === "post" ||
    normalized === "comment" ||
    normalized === "reply" ||
    normalized.startsWith("post_") ||
    normalized.startsWith("comment_") ||
    normalized.startsWith("reply_") ||
    (normalized.includes("comment") && 
      !normalized.includes("summarize") && 
      !normalized.includes("read") && 
      !normalized.includes("extract") && 
      !normalized.includes("inspect"))
  ) {
    return "L4";
  }

  // L3: Prepared interaction
  if (
    normalized.includes("fill") ||
    normalized.includes("prepare") ||
    normalized.includes("draft") && normalized.includes("review")
  ) {
    return "L3";
  }

  // L2: Private drafting
  if (normalized.includes("draft")) {
    return "L2";
  }

  // L1: Structured extraction / processing
  if (
    normalized.includes("summarize") ||
    normalized.includes("classify") ||
    normalized.includes("score") ||
    normalized.includes("extract") ||
    normalized.includes("save") ||
    normalized.includes("report")
  ) {
    return "L1";
  }

  // L0: Passive observation
  return "L0";
}

export function isActionAllowed(
  action: string,
  ceiling: RiskLevel,
  enablePublicWrite: boolean = false
): { allowed: boolean; reason?: string } {
  const actionLevel = getActionRiskLevel(action);
  const actionValue = RISK_VALUES[actionLevel];
  const ceilingValue = RISK_VALUES[ceiling];

  // Global MVP safety overrides:
  if (actionLevel === "L5") {
    return { allowed: false, reason: `Action '${action}' is L5 (prohibited) and always blocked.` };
  }

  if (actionLevel === "L4" && !enablePublicWrite) {
    return { allowed: false, reason: `Action '${action}' is L4 (public write) and public writes are disabled.` };
  }

  if (actionValue > ceilingValue) {
    return {
      allowed: false,
      reason: `Action '${action}' (level ${actionLevel}) exceeds task risk ceiling of ${ceiling}.`
    };
  }

  return { allowed: true };
}
