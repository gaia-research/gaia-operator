import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { OperatorTask } from "../../core/types.js";
import { TaskValidationError } from "../../core/errors.js";

export class QueueEntryLoadError extends TaskValidationError {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "QueueEntryLoadError";
    if (cause instanceof Error) {
      this.stack = `${this.name}: ${message}\nCaused by: ${cause.stack}`;
    }
  }
}

export interface QueueEntryRaw {
  metadata: Record<string, unknown>;
  body: string;
  filePath: string;
}

const DEFAULT_PLATFORMS_BY_CHANNEL: Record<string, string> = {
  reddit: "reddit",
  hn: "hackernews",
  newsletter: "generic",
  image: "generic",
  x: "x",
  producthunt: "generic",
  docs: "generic"
};

const DEFAULT_MODE_BY_CHANNEL: Record<string, "research" | "research_and_draft" | "prepare_interaction"> = {
  reddit: "research_and_draft",
  hn: "research_and_draft",
  docs: "research",
  x: "research_and_draft",
  newsletter: "research",
  producthunt: "research_and_draft"
};

const DEFAULT_RISK_CEILING = "L2";

function normalizeChannel(channel: unknown): string {
  return typeof channel === "string" ? channel.toLowerCase().replace(/[^a-z0-9-]+/g, "-") : "";
}

function toOutputTypes(mode: "research" | "research_and_draft" | "prepare_interaction"): Array<
  "markdown_report" | "findings_jsonl" | "opportunities_csv" | "draft_replies_markdown" | "evidence_screenshots_when_browser_used" | "trace_json" | "blocked_state_markdown" | "approval_request_markdown"
> {
  const outputs = new Set<string>([
    "markdown_report",
    "findings_jsonl",
    "trace_json",
    "blocked_state_markdown",
    "evidence_screenshots_when_browser_used"
  ]);

  if (mode === "research_and_draft" || mode === "prepare_interaction") {
    outputs.add("draft_replies_markdown");
    outputs.add("approval_request_markdown");
  }

  if (mode === "prepare_interaction" || mode === "research_and_draft") {
    outputs.add("opportunities_csv");
  }

  return Array.from(outputs) as Array<
    "markdown_report" | "findings_jsonl" | "opportunities_csv" | "draft_replies_markdown" | "evidence_screenshots_when_browser_used" | "trace_json" | "blocked_state_markdown" | "approval_request_markdown"
  >;
}

function inferQueries(body: string, title: string, link: string): string[] {
  const fragments = [title, link]
    .map((value) => value.replace(/https?:\/\//, "").replace(/[\/:?#]/g, " ").trim())
    .filter(Boolean);

  const cleanedBody = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_`>~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const sentenceCandidates = cleanedBody
    .split(/\.\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 35 && sentence.length < 220)
    .slice(0, 4);

  const queries = [...fragments, ...sentenceCandidates];
  return queries.length > 0 ? queries : [title || "marketing task research"];
}

function inferConstraints(raw: Record<string, unknown>, channel: string): Record<string, boolean | string | number> {
  const constraints: Record<string, boolean | string | number> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      constraints[key] = value;
    }
  }

  if (channel === "reddit") {
    constraints.require_approval = true;
    constraints.auto_post = false;
    constraints.allow_top_level_only_if_allowed = true;
    constraints.max_comments = 1;
    constraints.max_votes = 3;
    constraints.public_write_disabled = true;
  }

  if (channel === "hn" || channel === "x" || channel === "producthunt") {
    constraints.require_approval = true;
    constraints.auto_post = false;
    constraints.public_write_disabled = true;
  }

  if (channel === "newsletter" || channel === "docs") {
    constraints.require_approval = true;
    constraints.auto_post = false;
  }

  return constraints;
}

export class QueueEntryAdapter {
  static loadQueueEntry(filePath: string): QueueEntryRaw {
    if (!fs.existsSync(filePath)) {
      throw new QueueEntryLoadError(`Queue entry not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, "utf-8");
    let frontmatter = "{}";
    let body = content;

    const trimmedStart = content.trimStart();
    if (trimmedStart.startsWith("---")) {
      const rest = trimmedStart.slice(3);
      const endIndex = rest.indexOf("---");
      if (endIndex !== -1) {
        frontmatter = rest.slice(0, endIndex).trim();
        body = rest.slice(endIndex + 3).trimStart();
      }
    }

    let metadata: Record<string, unknown>;
    try {
      metadata = (yaml.load(frontmatter) ?? {}) as Record<string, unknown>;
    } catch (err: any) {
      throw new QueueEntryLoadError(`Failed to parse queue frontmatter: ${err.message}`, err);
    }

    return {
      metadata,
      body,
      filePath: path.resolve(filePath)
    };
  }

  static toOperatorTask(entry: QueueEntryRaw): OperatorTask {
    const metadata = entry.metadata;
    const title =
      (typeof metadata.title === "string" && metadata.title.trim()) ||
      (typeof metadata.id === "string" && metadata.id.trim()) ||
      path.basename(entry.filePath, path.extname(entry.filePath));
    const id = typeof metadata.id === "string" ? metadata.id.trim() : `queue-${path.basename(entry.filePath, path.extname(entry.filePath))}`;
    const channel = normalizeChannel(metadata.channel);
    const platformRaw = typeof metadata.platform === "string" ? metadata.platform.trim().toLowerCase() : "";
    const platform = platformRaw || DEFAULT_PLATFORMS_BY_CHANNEL[channel] || "generic";
    const mode = typeof metadata.mode === "string"
      ? metadata.mode.trim().toLowerCase() as OperatorTask["mode"]
      : (DEFAULT_MODE_BY_CHANNEL[channel] || "research");
    const riskCeiling = typeof metadata.risk_ceiling === "string" ? metadata.risk_ceiling.trim() : DEFAULT_RISK_CEILING;
    const link = typeof metadata.link === "string" ? metadata.link.trim() : "";

    const queries = inferQueries(entry.body.trim(), typeof title === "string" ? title : "", link);
    const constraints = inferConstraints(metadata, channel);

    const personaRef = typeof metadata.voice === "string"
      ? metadata.voice.trim()
      : typeof metadata.voice === "object" && metadata.voice !== null && typeof (metadata.voice as Record<string, unknown>).persona_ref === "string"
        ? ((metadata.voice as Record<string, unknown>).persona_ref as string).trim()
        : undefined;

    const task: OperatorTask = {
      id: typeof id === "string" ? id : `queue-${path.basename(entry.filePath, path.extname(entry.filePath))}`,
      title: typeof title === "string" ? title : path.basename(entry.filePath, path.extname(entry.filePath)),
      campaign: typeof metadata.campaign === "string" && metadata.campaign.trim() ? metadata.campaign.trim() : undefined,
      platforms: [platform as OperatorTask["platforms"][number]],
      mode,
      risk_ceiling: riskCeiling as OperatorTask["risk_ceiling"],
      voice:
        channel === "reddit" || personaRef
          ? {
              persona_ref: channel === "reddit" ? "personas/nova.md" : personaRef,
              soul_ref: typeof metadata.voice === "object" && metadata.voice !== null && typeof (metadata.voice as Record<string, unknown>).soul_ref === "string"
                ? ((metadata.voice as Record<string, unknown>).soul_ref as string).trim()
                : undefined
            }
          : undefined,
      guardrails: {
        source: typeof metadata.guardrails === "object" && metadata.guardrails !== null && typeof (metadata.guardrails as Record<string, unknown>).source === "string"
          ? ((metadata.guardrails as Record<string, unknown>).source as OperatorTask["guardrails"]["source"])
          : "marketing-tasks",
        refs: Array.isArray((metadata.guardrails as Record<string, unknown> | undefined)?.refs)
          ? ((metadata.guardrails as Record<string, unknown>).refs as string[])
          : ["marketing-tasks"]
      },
      objective: entry.body.trim(),
      queries,
      constraints,
      outputs: toOutputTypes(mode)
    };

    return task;
  }

  static parseFile(filePath: string): OperatorTask {
    const entry = this.loadQueueEntry(filePath);
    return this.toOperatorTask(entry);
  }
}
