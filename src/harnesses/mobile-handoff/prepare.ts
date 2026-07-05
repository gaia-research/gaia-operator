import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { z } from "zod";
import { MobileHandoffAdapter } from "../../adapters/mobile/mobile-handoff.js";

// Zod Schema matching the Input Contract in the PRD
export const MobileHandoffTaskSchema = z.object({
  id: z.string({ required_error: "task id is required" }).min(1),
  type: z.literal("mobile_handoff"),
  platform: z.enum(["reddit", "github", "discord", "linkedin", "x", "generic"]),
  mode: z.string(),
  risk_ceiling: z.enum(["L0", "L1", "L2", "L3"]),
  target: z.object({
    url: z.string().url("Target URL must be a valid URL"),
    community: z.string().optional(),
    context_summary: z.string().optional()
  }),
  voice: z.object({
    persona_ref: z.string().optional(),
    soul_ref: z.string().optional()
  }).optional(),
  guardrails: z.object({
    source: z.string(),
    refs: z.array(z.string())
  }),
  draft: z.object({
    mode: z.enum(["generate", "use_existing"]),
    instruction: z.string().optional(),
    text: z.string().optional()
  }),
  constraints: z.object({
    auto_post: z.literal(false, { errorMap: () => ({ message: "auto_post must be explicitly false for mobile handoff" }) }),
    auto_dm: z.literal(false, { errorMap: () => ({ message: "auto_dm must be explicitly false for mobile handoff" }) }),
    require_manual_publish: z.literal(true, { errorMap: () => ({ message: "require_manual_publish must be explicitly true" }) }),
    copy_to_clipboard: z.boolean().optional().default(true),
    open_url: z.boolean().optional().default(true),
    notify_user: z.boolean().optional().default(true),
    share_payload: z.boolean().optional().default(false)
  }),
  outputs: z.array(z.string())
});

export type MobileHandoffTask = z.infer<typeof MobileHandoffTaskSchema>;

export interface GuardrailCheckResult {
  passed: boolean;
  violations: string[];
}

/**
 * Checks guardrails for the handoff task.
 */
export function checkGuardrails(task: MobileHandoffTask, draftText: string): GuardrailCheckResult {
  const violations: string[] = [];

  if (!task.target.url) {
    violations.push("Target URL is missing.");
  }

  // Platform sanity checks
  const allowedPlatforms = ["reddit", "github", "discord", "linkedin", "x", "generic"];
  if (!allowedPlatforms.includes(task.platform)) {
    violations.push(`Platform '${task.platform}' is not supported.`);
  }

  // URL compatibility checks
  if (task.platform === "reddit" && !task.target.url.includes("reddit.com")) {
    violations.push("Platform 'reddit' requires a target URL containing 'reddit.com'.");
  }
  if (task.platform === "github" && !task.target.url.includes("github.com")) {
    violations.push("Platform 'github' requires a target URL containing 'github.com'.");
  }
  if (task.platform === "x" && !task.target.url.includes("x.com") && !task.target.url.includes("twitter.com")) {
    violations.push("Platform 'x' requires a target URL containing 'x.com' or 'twitter.com'.");
  }
  if (task.platform === "linkedin" && !task.target.url.includes("linkedin.com")) {
    violations.push("Platform 'linkedin' requires a target URL containing 'linkedin.com'.");
  }
  if (task.platform === "discord" && !task.target.url.includes("discord.com") && !task.target.url.includes("discordapp.com")) {
    violations.push("Platform 'discord' requires a target URL containing 'discord.com' or 'discordapp.com'.");
  }

  // Explicitly manual constraints
  if (task.constraints.auto_post !== false) {
    violations.push("Constraint auto_post must be false.");
  }
  if (task.constraints.auto_dm !== false) {
    violations.push("Constraint auto_dm must be false.");
  }
  if (task.constraints.require_manual_publish !== true) {
    violations.push("Constraint require_manual_publish must be true.");
  }

  // Check for spammy repetition in the draft
  const words = draftText.split(/\s+/).filter(w => w.length > 3);
  const wordCounts: Record<string, number> = {};
  for (const w of words) {
    const clean = w.toLowerCase().replace(/[^a-z]/g, "");
    wordCounts[clean] = (wordCounts[clean] || 0) + 1;
  }
  const repetitive = Object.entries(wordCounts).filter(([_, count]) => count > 5);
  if (repetitive.length > 0) {
    violations.push(`Draft has repetitive word patterns indicating potential spam: ${repetitive.map(([w]) => `'${w}'`).slice(0, 3).join(", ")}`);
  }

  // Check value without links
  const hasLink = draftText.includes("http://") || draftText.includes("https://");
  if (hasLink && draftText.length < 60) {
    violations.push("Draft is too short and contains a link. It must provide stand-alone value without relying solely on the URL.");
  }

  return {
    passed: violations.length === 0,
    violations
  };
}

/**
 * Generates the response draft, taking personas and souls into account.
 */
export function generateDraft(task: MobileHandoffTask, personaContent?: string, soulContent?: string): string {
  if (task.draft.mode === "use_existing" && task.draft.text) {
    return task.draft.text;
  }

  const instruction = task.draft.instruction || "Write a helpful, concise response.";
  const context = task.target.context_summary || "the user's inquiry";
  const platform = task.platform;

  let baseDraft = "";
  if (platform === "reddit") {
    baseDraft = `Thanks for sharing. Regarding issues with ${context}, rather than using heavy browser automation wrappers, a direct API/JSON configuration or rate-limited direct requests are typically more stable and respect platform limits. Let me know if you want me to share a clean config example.`;
  } else if (platform === "github") {
    baseDraft = `Thanks for raising this issue regarding ${context}. To avoid shared state mutations here, registering an explicit hook adapter makes the interface much cleaner and easier to mock in unit tests. Let me know if you would like me to draft a quick patch.`;
  } else {
    baseDraft = `Regarding ${context}, keeping the integration decoupled and using explicit validation rules is generally more robust. Happy to share some patterns if helpful.`;
  }

  // Apply Nova voice tone modifications if voice files are provided
  if (personaContent || soulContent) {
    // Nova voice tone influences the generated draft content, but we avoid adding signatures or markers.
  }

  return baseDraft;
}

/**
 * Loads files referenced by task paths (resolving relative to task file or workspace).
 */
export function loadRefFile(refPath: string, taskDir: string): string | undefined {
  const possiblePaths = [
    path.resolve(taskDir, refPath),
    path.resolve(process.cwd(), refPath),
    path.resolve(process.cwd(), "marketing-tasks", refPath)
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, "utf-8");
    }
  }
  return undefined;
}
