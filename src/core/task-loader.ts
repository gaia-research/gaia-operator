import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { z } from "zod";
import { OperatorTask } from "./types.js";
import { TaskValidationError } from "./errors.js";

const platformSchema = z.enum(["reddit", "hackernews", "github", "discord", "linkedin", "x", "youtube", "generic"]);

const outputTypeSchema = z.enum([
  "markdown_report",
  "findings_jsonl",
  "opportunities_csv",
  "draft_replies_markdown",
  "evidence_screenshots_when_browser_used",
  "trace_json",
  "blocked_state_markdown",
  "approval_request_markdown"
]);

const riskLevelSchema = z.enum(["L0", "L1", "L2", "L3", "L4", "L5"]);

export const TaskZodSchema = z.object({
  id: z.string({ required_error: "id is required" }).min(1),
  title: z.string({ required_error: "title is required" }).min(1),
  campaign: z.string().optional(),
  platforms: z.array(platformSchema).min(1, "At least one platform is required"),
  mode: z.enum(["research", "research_and_draft", "prepare_interaction"]),
  risk_ceiling: riskLevelSchema,
  voice: z.object({
    persona_ref: z.string().optional(),
    soul_ref: z.string().optional(),
  }).optional(),
  guardrails: z.object({
    source: z.enum(["marketing-tasks", "local"]),
    refs: z.array(z.string())
  }),
  objective: z.string({ required_error: "objective is required" }).min(1),
  queries: z.array(z.string()).optional(),
  constraints: z.record(z.union([z.boolean(), z.string(), z.number()])),
  outputs: z.array(outputTypeSchema).min(1, "At least one output is required")
});

export class TaskLoader {
  static loadFromFile(filePath: string): OperatorTask {
    if (!fs.existsSync(filePath)) {
      throw new TaskValidationError(`Task file not found at path: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, "utf-8");
    let parsed: any;

    const ext = path.extname(filePath).toLowerCase();
    try {
      if (ext === ".yaml" || ext === ".yml") {
        parsed = yaml.load(content);
      } else if (ext === ".json") {
        parsed = JSON.parse(content);
      } else {
        // Try YAML parsing as a fallback
        parsed = yaml.load(content);
      }
    } catch (err: any) {
      throw new TaskValidationError(`Failed to parse task file content: ${err.message}`);
    }

    return this.validate(parsed);
  }

  static validate(data: any): OperatorTask {
    const result = TaskZodSchema.safeParse(data);
    if (!result.success) {
      const formattedErrors = result.error.format();
      throw new TaskValidationError(
        `Task validation failed: ${result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ")}`,
        formattedErrors
      );
    }
    return result.data as OperatorTask;
  }
}
