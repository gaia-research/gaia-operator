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

// Action names are matched as whole "_"/"-"-delimited tokens against a CLOSED
// vocabulary. Any token outside it (an unknown verb such as "retweet",
// "connect", "click", "approve", or a concatenation such as "autopost") makes
// the whole action unrecognised, and unrecognised actions are denied. A known
// read verb elsewhere in the name cannot launder an unknown one.

// Verbs that perform a platform-side write. Present anywhere in the name they
// make the action L4; no qualifier exempts them ("draft_and_submit_post" is L4).
const WRITE_VERBS = new Set([
  "submit", "publish", "send", "repost", "crosspost", "share", "join", "follow",
  "unfollow", "subscribe", "vote", "upvote", "downvote", "like", "delete", "award"
]);

// Nouns/verbs that are writes on their own ("post", "thread_reply") unless
// they are the direct object of a qualifier verb ("draft_reply").
const WRITE_NOUNS = new Set([
  "post", "posts", "reply", "replies", "comment", "comments"
]);

// "report"/"save"/"flag"/"hide"/"block"/"mute" together with a platform object
// (either order) is a platform-side action, not report generation.
const PLATFORM_ACTION_VERBS = new Set(["report", "save", "flag", "hide", "block", "mute"]);
const PLATFORM_OBJECTS = new Set([
  "user", "users", "post", "posts", "comment", "comments", "reply", "replies", "thread", "threads",
  "account", "accounts", "content", "community", "communities", "subreddit", "subreddits", "repo", "repos"
]);

// Private objects: any action on them is private scraping (L5) unless the
// whole name is an explicit send ("send_message", "send_dm").
const PRIVATE_OBJECTS = new Set([
  "message", "messages", "inbox", "dm", "dms", "chat", "chats", "conversation", "conversations"
]);

// Verbs that only observe public state.
const L0_OBSERVE_TOKENS = new Set([
  "read", "observe", "navigate", "inspect", "view", "search", "research", "fetch",
  "scroll", "screenshot", "snapshot", "list", "visit"
]);

// Local processing verbs.
const L1_TOKENS = new Set(["summarize", "classify", "score", "extract", "analyze", "save", "report", "generate"]);

// Verbs that may take a write noun as their DIRECT object without performing it.
const NOUN_QUALIFIERS = new Set([...L0_OBSERVE_TOKENS, ...L1_TOKENS, "draft", "prepare", "fill", "review"]);

// Objects and connective words that carry no capability of their own.
const BENIGN_TOKENS = new Set([
  "page", "pages", "public", "thread", "threads", "title", "titles", "url", "urls", "query", "queries",
  "result", "results", "link", "links", "user", "users", "profile", "profiles", "community", "communities",
  "subreddit", "subreddits", "repo", "repos", "issue", "issues", "feed", "timeline", "finding", "findings",
  "evidence", "data", "summary", "content", "text", "state", "html", "dom", "accessibility", "tree",
  "details", "metadata", "more", "box", "form", "field", "fields", "attempt", "account", "accounts",
  "interaction", "task", "mode", "each", "all", "top", "new", "latest", "item", "items", "image", "images",
  "media", "tag", "tags", "stub", "opportunity", "opportunities", "angle", "trace", "artifacts",
  "the", "a", "an", "to", "for", "on", "of", "and", "then", "or", "with", "from", "in", "by", "at", "as", "run", "it", "this"
]);

const CONNECTIVES = new Set(["the", "a", "an", "to", "for", "on", "of", "and", "then", "or", "with", "from", "in", "by", "at", "as", "run", "it", "this", "each", "all"]);
const OBJECT_NOUNS = new Set([...BENIGN_TOKENS].filter((t) => !CONNECTIVES.has(t)));

const KNOWN_TOKENS = new Set([
  ...WRITE_VERBS, ...WRITE_NOUNS, ...PLATFORM_ACTION_VERBS, ...PLATFORM_OBJECTS, ...PRIVATE_OBJECTS,
  ...L0_OBSERVE_TOKENS, ...L1_TOKENS, ...NOUN_QUALIFIERS, ...BENIGN_TOKENS
]);

const UNRECOGNISED: ActionClassification = { level: "L4", recognized: false };

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

  if (tokens.length === 0 || tokens.some((t) => !KNOWN_TOKENS.has(t))) {
    return UNRECOGNISED;
  }

  // Private objects: L5, unless the name is only an explicit send
  // ("send_message", "message_send", "send_dm"). "read_inbox_and_send_reply"
  // reads the inbox, so it is L5.
  if (hasAny(PRIVATE_OBJECTS)) {
    const explicitSend = has("send") && tokens.every((t) => t === "send" || PRIVATE_OBJECTS.has(t) || t === "to" || t === "a");
    return { level: explicitSend ? "L4" : "L5", recognized: true };
  }

  const platformAction = hasAny(PLATFORM_ACTION_VERBS) && hasAny(PLATFORM_OBJECTS);
  // A write noun is exempt only as the DIRECT object of a qualifier verb: the
  // token immediately before it must be read/draft/prepare-like.
  // Plain object nouns may sit between ("read_thread_comments"); another write
  // noun or a connective may not ("list_posts_comment_on_each",
  // "read_to_reply"), which keeps the rule fail closed.
  const unexemptedWriteNoun = tokens.some((t, i) => {
    if (!WRITE_NOUNS.has(t)) return false;
    for (let j = i - 1; j >= 0; j--) {
      if (NOUN_QUALIFIERS.has(tokens[j])) return false;
      if (!OBJECT_NOUNS.has(tokens[j])) return true;
    }
    return true;
  });

  // L4: Public write / irreversible action
  if (platformAction || hasAny(WRITE_VERBS) || unexemptedWriteNoun) {
    return { level: "L4", recognized: true };
  }

  // L3: Prepared interaction
  if (has("fill") || has("prepare") || (has("draft") && has("review"))) {
    return { level: "L3", recognized: true };
  }

  // L2: Private drafting ("generate_reply" drafts a reply just as "draft_reply" does)
  if (has("draft") || (has("generate") && hasAny(WRITE_NOUNS))) {
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

  // Only objects/connectives, no verb: nothing to authorise.
  return UNRECOGNISED;
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
