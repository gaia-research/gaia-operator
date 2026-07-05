import * as fs from "fs";
import * as path from "path";

export interface ReportSummary {
  taskId: string;
  status: string;
  guardrailsPassed: boolean;
  targetUrl: string;
  notes?: string;
  timestamp: string;
}

export class MobileReportGenerator {
  /**
   * Generates a status report summarizing the handoff and its result.
   */
  static generateSummary(taskId: string): ReportSummary | null {
    const handoffsDir = path.resolve(process.cwd(), ".gaia-operator", "mobile", "handoffs");
    const taskDir = path.join(handoffsDir, taskId);

    if (!fs.existsSync(taskDir)) {
      return null;
    }

    let status = "prepared";
    let notes = "";
    let timestamp = new Date().toISOString();
    let targetUrl = "";
    let guardrailsPassed = false;

    // Load target info
    const targetPath = path.join(taskDir, "target.json");
    if (fs.existsSync(targetPath)) {
      try {
        const target = JSON.parse(fs.readFileSync(targetPath, "utf-8"));
        targetUrl = target.url || "";
      } catch {}
    }

    // Load guardrails status
    const guardrailCheckPath = path.join(taskDir, "guardrail-check.md");
    if (fs.existsSync(guardrailCheckPath)) {
      const content = fs.readFileSync(guardrailCheckPath, "utf-8");
      guardrailsPassed = content.includes("PASSED") && !content.includes("FAILED");
    }

    // Load final captured result
    const resultPath = path.join(taskDir, "result.json");
    if (fs.existsSync(resultPath)) {
      try {
        const res = JSON.parse(fs.readFileSync(resultPath, "utf-8"));
        status = res.manual_result || status;
        notes = res.notes || "";
        timestamp = res.timestamp || timestamp;
      } catch {}
    }

    return {
      taskId,
      status,
      guardrailsPassed,
      targetUrl,
      notes,
      timestamp
    };
  }

  /**
   * Generates a markdown representation of the execution summary.
   */
  static generateMarkdownSummary(taskId: string): string {
    const summary = this.generateSummary(taskId);
    if (!summary) {
      return `### Mobile Handoff Report: ${taskId}\n\nTask artifacts not found.`;
    }

    return `### Mobile Handoff Report: ${summary.taskId}
- **Status**: ${summary.status}
- **Guardrails**: ${summary.guardrailsPassed ? "Passed ✅" : "Blocked/Failed ❌"}
- **Target URL**: ${summary.targetUrl}
- **Notes**: ${summary.notes || "No review notes provided."}
- **Last Sync Timestamp**: ${summary.timestamp}
`;
  }
}
