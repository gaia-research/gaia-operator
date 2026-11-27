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

// Action names are matched as whole "_"/"-"-delimited tokens. Substring
// matching let "thread_reply" pass as L0 because "thread" contains "read".
// Concatenations such as "autopost" match nothing and are denied.

// Verbs that perform a platform-side write. Present anywhere in the name they
// make the action L4; no qualifier exempts them ("draft_and_submit_post" is L4).
const WRITE_VERBS = new Set([
  "submit", "publish", "send", "dm", "repost", "crosspost", "share", "join", "follow",
  "unfollow", "subscribe", "vote", "upvote", "downvote", "like", "delete", "award"
]);

// Nouns/verbs that are writes on their own ("post", "thread_reply") but are
// legitimately mentioned by drafting or read-only actions ("draft_reply",
// "summarize_comments", "read_posts").
const WRITE_NOUNS = new Set([
  "post", "posts", "reply", "replies", "comment", "comments", "message", "messages"
]);

// Read-only / local verbs that may legitimately mention a write noun.
const READ_QUALIFIERS = new Set([
  "summarize", "read", "extract", "inspect", "classify", "score", "analyze",
  "view", "list", "search", "fetch", "observe"
]);

// "report"/"save"/"flag"/"hide"/"block" followed by a platform object is a
// platform-side action (report a user, save a post), not report generation.
const PLATFORM_ACTION_VERBS = new Set(["report", "save", "flag", "hide", "block", "mute"]);
const PLATFORM_OBJECTS = new Set(["user", "users", "post", "posts", "comment", "comments", "thread", "threads", "account", "content", "message"]);

// Verbs that only observe public state. Anything that is not matched by a
// higher-risk rule AND not matched here is unrecognised and denied.
const L0_OBSERVE_TOKENS = new Set([
  "read", "observe", "navigate", "inspect", "view", "search", "research", "fetch",
  "scroll", "screenshot", "snapshot", "list", "visit"
]);

// Input/execution verbs. Outside the recognised L3 "fill"/"prepare" path they
// make an action unrecognised (denied) so a read token elsewhere in the name
// cannot launder them ("type_search_query", "upload_screenshot").
const INTERACTION_VERBS = new Set([
  "type", "click", "tap", "press", "input", "enter", "upload", "download", "drag", "drop",
  "execute", "exec", "shell", "command", "install", "write", "edit", "update", "create",
  "modify", "rename", "move", "remove", "open", "login", "logout", "signin", "signup", "authorize"
]);

const CONJUNCTIONS = new Set(["and", "then", "plus", "also", "or"]);

// Verbs that may take a write noun as their object without performing it.
const NOUN_QUALIFIERS = new Set([
  ...READ_QUALIFIERS,
  ...L0_OBSERVE_TOKENS,
  "draft", "prepare", "fill", "review"
]);

const L1_TOKENS = new Set(["summarize", "classify", "score", "extract", "save", "report"]);

export function classifyAction(action: string): ActionClassification {
  const normalized = action.toLowerCase();
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  const has = (token: string) => tokens.includes(token);
  const hasAny = (set: Set<string>) => tokens.some((t) => set.has(t));

  // L5: Prohibited / Sensitive. Substring matching is deliberate here: this is
  // a denylist, so over-matching errs toward refusal.
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

  const hasDraft = has("draft");
  const hasWriteVerb = hasAny(WRITE_VERBS);
  // A write noun is exempt only as the object of an EARLIER read/draft/
  // prepare verb with no conjunction in between: "draft_reply",
  // "summarize_comments", "navigate_to_post" are not writes; "post_draft",
  // "research_and_post", "comment_then_view" are.
  const unexemptedWriteNoun = tokens.some((t, i) => {
    if (!WRITE_NOUNS.has(t)) return false;
    for (let j = i - 1; j >= 0; j--) {
      if (CONJUNCTIONS.has(tokens[j])) return true;
      if (NOUN_QUALIFIERS.has(tokens[j])) return false;
    }
    return true;
  });
  const platformAction = tokens.some(
    (t, i) => PLATFORM_ACTION_VERBS.has(t) && tokens.slice(i + 1).some((n) => PLATFORM_OBJECTS.has(n))
  );

  // L4: Public write / irreversible action
  if (platformAction || hasWriteVerb || unexemptedWriteNoun) {
    return { level: "L4", recognized: true };
  }

  // L3: Prepared interaction
  if (has("fill") || has("prepare") || (hasDraft && has("review"))) {
    return { level: "L3", recognized: true };
  }

  if (hasAny(INTERACTION_VERBS)) {
    return { level: "L4", recognized: false };
  }

  // L2: Private drafting
  if (hasDraft) {
    return { level: "L2", recognized: true };
  }

  // L1: Structured extraction / processing
  if (hasAny(L1_TOKENS)) {
    return { level: "L1", recognized: true };
  }

  // L0: Passive observation, only for explicitly recognised read verbs.
  if (hasAny(L0_OBSERVE_TOKENS)) {
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
