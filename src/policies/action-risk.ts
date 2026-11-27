import { RiskLevel } from "../core/types.js";

export const RISK_VALUES: Record<RiskLevel, number> = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
  L5: 5
};

export interface ActionClassification {
  level: RiskLevel;
  /**
   * False when no rule recognised the action name. Unrecognised actions are
   * never treated as passive observation: the policy gate denies them
   * (fail closed) instead of defaulting them to L0.
   */
  recognized: boolean;
}

// Verbs that only observe public state. Anything that is not matched by a
// higher-risk rule AND not matched here is unrecognised and denied.
const L0_OBSERVE_TOKENS = [
  "read",
  "observe",
  "navigate",
  "inspect",
  "view",
  "search",
  "fetch",
  "scroll",
  "screenshot",
  "snapshot",
  "list",
  "open_page",
  "visit"
];

export function classifyAction(action: string): ActionClassification {
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
    normalized.includes("login_change") ||
    normalized.includes("credential") ||
    normalized.includes("password") ||
    normalized.includes("cookie_export") ||
    normalized.includes("session_export")
  ) {
    return { level: "L5", recognized: true };
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
    normalized.includes("delete") ||
    normalized.includes("upvote") ||
    normalized.includes("downvote") ||
    normalized === "vote" ||
    normalized.startsWith("vote_") ||
    normalized === "like" ||
    normalized.startsWith("like_") ||
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
    return { level: "L4", recognized: true };
  }

  // L3: Prepared interaction
  if (
    normalized.includes("fill") ||
    normalized.includes("prepare") ||
    (normalized.includes("draft") && normalized.includes("review"))
  ) {
    return { level: "L3", recognized: true };
  }

  // L2: Private drafting
  if (normalized.includes("draft")) {
    return { level: "L2", recognized: true };
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
    return { level: "L1", recognized: true };
  }

  // L0: Passive observation, only for explicitly recognised read verbs.
  if (L0_OBSERVE_TOKENS.some((token) => normalized.includes(token))) {
    return { level: "L0", recognized: true };
  }

  // Unknown verb (e.g. "click", "type", "execute"). Report the most
  // restrictive non-prohibited level so callers that only read the level
  // still treat it as a write; isActionAllowed denies it outright.
  return { level: "L4", recognized: false };
}

export function getActionRiskLevel(action: string): RiskLevel {
  return classifyAction(action).level;
}

export function isActionAllowed(
  action: string,
  ceiling: RiskLevel,
  enablePublicWrite: boolean = false
): { allowed: boolean; reason?: string } {
  const { level: actionLevel, recognized } = classifyAction(action);
  const actionValue = RISK_VALUES[actionLevel];
  const ceilingValue = RISK_VALUES[ceiling];

  if (!recognized) {
    return {
      allowed: false,
      reason: `Action '${action}' is not a recognised capability; unrecognised actions are denied (fail closed).`
    };
  }

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
