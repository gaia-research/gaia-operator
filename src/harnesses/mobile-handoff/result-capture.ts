import * as fs from "fs";
import * as path from "path";

export const ALLOWED_STATUSES = [
  "posted",
  "posted_with_edits",
  "rejected",
  "saved_for_later",
  "needs_research",
  "blocked_by_platform",
  "blocked_by_rules"
];

// Map shortcut statuses to standard status names
export function mapStatus(input: string): string {
  const norm = input.toLowerCase().replace(/_/g, "");
  if (norm === "posted") return "posted";
  if (norm === "postedwithedits") return "posted_with_edits";
  if (norm === "rejected") return "rejected";
  if (norm === "saved" || norm === "savedforlater") return "saved_for_later";
  if (norm === "needsresearch") return "needs_research";
  if (norm === "blockedbyplatform") return "blocked_by_platform";
  if (norm === "blockedbyrules") return "blocked_by_rules";
  return input;
}

export interface ResultCaptureOptions {
  taskId: string;
  status: string;
  notes?: string;
  force?: boolean;
}

export interface CaptureOutput {
  success: boolean;
  message: string;
  resultPath?: string;
}

export class ResultCapture {
  /**
   * Captures the manual review result and writes result.json.
   */
  static record(options: ResultCaptureOptions): CaptureOutput {
    const status = mapStatus(options.status);
    if (!ALLOWED_STATUSES.includes(status)) {
      return {
        success: false,
        message: `Invalid status: "${options.status}". Allowed: ${ALLOWED_STATUSES.join(", ")}`
      };
    }

    const handoffsDir = path.resolve(process.cwd(), ".gaia-operator", "mobile", "handoffs");
    const taskDir = path.join(handoffsDir, options.taskId);
    const altHandoffsDir = path.resolve(process.cwd(), "artifacts", "mobile-handoff");
    const altTaskDir = path.join(altHandoffsDir, options.taskId);

    const hasPreparedArtifacts = 
      (fs.existsSync(taskDir) && (
        fs.existsSync(path.join(taskDir, "handoff-card.md")) ||
        fs.existsSync(path.join(taskDir, "draft.txt")) ||
        fs.existsSync(path.join(taskDir, "target.json")) ||
        fs.existsSync(path.join(taskDir, "guardrail-check.md"))
      )) ||
      (fs.existsSync(altTaskDir) && (
        fs.existsSync(path.join(altTaskDir, "handoff-card.md")) ||
        fs.existsSync(path.join(altTaskDir, "draft.txt")) ||
        fs.existsSync(path.join(altTaskDir, "target.json")) ||
        fs.existsSync(path.join(altTaskDir, "guardrail-check.md"))
      ));

    if (!hasPreparedArtifacts && !options.force) {
      return {
        success: false,
        message: `No prepared handoff artifacts found for task "${options.taskId}". Please prepare the task first or use the --force flag.`
      };
    }

    // Make sure directories exist for writing
    if (!fs.existsSync(taskDir)) {
      fs.mkdirSync(taskDir, { recursive: true });
    }
    if (!fs.existsSync(altTaskDir)) {
      fs.mkdirSync(altTaskDir, { recursive: true });
    }

    const resultPayload: Record<string, any> = {
      task_id: options.taskId,
      manual_result: status,
      posted_by: "human",
      agent_public_action: false,
      notes: options.notes || "",
      timestamp: new Date().toISOString()
    };

    if (!hasPreparedArtifacts && options.force) {
      resultPayload.unverified_capture = true;
    }

    const paths = [
      path.join(taskDir, "result.json"),
      path.join(altTaskDir, "result.json")
    ];

    try {
      for (const p of paths) {
        fs.writeFileSync(p, JSON.stringify(resultPayload, null, 2), "utf-8");
      }
      return {
        success: true,
        message: `Recorded status "${status}" for task "${options.taskId}"` + (!hasPreparedArtifacts ? " (UNVERIFIED)" : ""),
        resultPath: paths[0]
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to write result file: ${err.message}`
      };
    }
  }
}
