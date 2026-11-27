import * as fs from "fs";
import * as path from "path";
import { StateStore, resolveContained } from "./state-store.js";
import { Trace, Finding, InteractionOpportunity, BlockedState } from "./types.js";
import { PrivacyChecker } from "../policies/privacy.js";

/**
 * Artifacts mix operator-authored text with untrusted platform content (thread
 * titles, page titles, community names). These helpers keep that content from
 * forging structure in the review documents a human acts on.
 */

// Collapse to one line so content cannot inject headings, checkboxes such as
// "- [x] Approve as-is", or extra list items into approval/draft cards.
export function inlineText(value: string | undefined): string {
  return (value ?? "").replace(/[\r\n\u2028\u2029]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

// Fence text with more backticks than any run it contains, so it cannot close
// the fence early and continue as live markdown.
export function fencedText(value: string | undefined, info = "text"): string {
  const text = value ?? "";
  const longestRun = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}${info}\n${text}\n${fence}`;
}

// Neutralise spreadsheet formula injection (=, +, -, @, tab, CR) before CSV
// quoting, per OWASP CSV-injection guidance.
export function csvCell(value: string | undefined): string {
  let text = value ?? "";
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

function writeRedacted(filePath: string, content: string): void {
  fs.writeFileSync(filePath, PrivacyChecker.filterSensitiveData(content), "utf-8");
}

function writeRedactedJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(PrivacyChecker.redactDeep(value), null, 2), "utf-8");
}

export class ArtifactWriter {
  private store: StateStore;

  constructor(store: StateStore) {
    this.store = store;
  }

  writeTrace(taskId: string, trace: Trace): string {
    const taskDir = this.store.getArtifactsDir(taskId);
    const tracePath = path.join(taskDir, "trace.json");
    writeRedactedJson(tracePath, trace);

    const globalTracePath = resolveContained(this.store.getTracesDir(), `${taskId}_trace.json`);
    writeRedactedJson(globalTracePath, trace);

    return tracePath;
  }

  writeFindingsJsonl(taskId: string, findings: Finding[]): string {
    const taskDir = this.store.getArtifactsDir(taskId);
    const filePath = path.join(taskDir, "findings.jsonl");
    const content = findings.map(f => JSON.stringify(PrivacyChecker.redactDeep(f))).join("\n");
    fs.writeFileSync(filePath, content, "utf-8");
    return filePath;
  }

  writeOpportunitiesCsv(taskId: string, opportunities: InteractionOpportunity[]): string {
    const taskDir = this.store.getArtifactsDir(taskId);
    const filePath = path.join(taskDir, "opportunities.csv");

    const headers = "id,finding_id,target_url,community,nova_voice_status,risk_level,approval_required\n";
    const rows = opportunities.map(o => {
      return [
        csvCell(o.id),
        csvCell(o.finding_id),
        csvCell(o.target_url),
        csvCell(o.community),
        csvCell(o.nova_voice_status),
        csvCell(o.risk_level),
        o.approval_required ? "true" : "false"
      ].join(",");
    }).join("\n");

    writeRedacted(filePath, headers + rows);
    return filePath;
  }

  writeDraftRepliesMarkdown(taskId: string, opportunities: InteractionOpportunity[]): string {
    const taskDir = this.store.getArtifactsDir(taskId);
    const filePath = path.join(taskDir, "draft-replies.md");

    let markdown = `# Draft Replies for Task: ${taskId}\n\n`;
    markdown += `Public posting is disabled in the MVP. Treat every reply below as private review material until a human approves exact text and target.\n\n`;

    if (opportunities.length === 0) {
      markdown += "_No draft replies generated._\n";
    } else {
      for (const opt of opportunities) {
        markdown += `## Opportunity: ${inlineText(opt.id)}\n`;
        markdown += `- **Target URL:** ${inlineText(opt.target_url)}\n`;
        markdown += `- **Community:** ${inlineText(opt.community)}\n`;
        markdown += `- **User Need:** ${inlineText(opt.user_need)}\n`;
        markdown += `- **Suggested Angle:** ${inlineText(opt.suggested_angle)}\n`;
        markdown += `- **Voice Status:** ${opt.nova_voice_status}\n`;
        markdown += `- **Risk Level:** ${opt.risk_level}\n`;
        markdown += `- **Approval Required:** ${opt.approval_required ? "YES" : "NO"}\n\n`;
        markdown += `### Draft Reply Text\n${fencedText(opt.draft_reply || "(Empty draft)")}\n\n`;
        markdown += `---\n\n`;
      }
    }

    writeRedacted(filePath, markdown);
    return filePath;
  }

  writeMarkdownReport(taskId: string, reportContent: string): string {
    const taskDir = this.store.getArtifactsDir(taskId);
    const filePath = path.join(taskDir, "report.md");
    writeRedacted(filePath, reportContent);
    return filePath;
  }

  writeBlockedState(taskId: string, blocked: BlockedState): string {
    const taskDir = this.store.getArtifactsDir(taskId);
    const filePath = path.join(taskDir, "blocked-state.md");

    const markdown = `# Blocked State Report\n\n- **Task ID:** ${blocked.task_id}\n- **Platform:** ${blocked.platform}\n- **Block Type:** ${blocked.block_type}\n- **URL:** ${inlineText(blocked.url) || "N/A"}\n- **Action Taken:** ${blocked.action_taken}\n- **Public Actions Taken:** ${blocked.public_actions_taken}\n\n## Description\n${blocked.description}\n\n## Recommended Human Action\n${blocked.recommended_human_action}\n\n## Evidence References\n${blocked.evidence_refs.length > 0 ? blocked.evidence_refs.map(ref => `- ${ref}`).join("\n") : "_No evidence references captured._"}\n`;

    writeRedacted(filePath, markdown);
    return filePath;
  }

  writeApprovalRequest(taskId: string, opportunities: InteractionOpportunity[]): string {
    const taskDir = this.store.getArtifactsDir(taskId);
    const filePath = path.join(taskDir, "approval-request.md");

    let markdown = `# Approval Request\n\n`;
    markdown += `Review the proposed draft-only actions for task **${taskId}**. Gaia Operator did not post, message, vote, join, or publish anything.\n\n`;

    for (const opt of opportunities) {
      markdown += `## Request ID: ${inlineText(opt.id)}\n`;
      markdown += `- **Target Platform:** Reddit\n`;
      markdown += `- **Target URL:** ${inlineText(opt.target_url)}\n`;
      markdown += `- **Risk Level:** ${opt.risk_level}\n`;
      markdown += `- **Voice Status:** ${opt.nova_voice_status}\n`;
      markdown += `- **Approval Required:** ${opt.approval_required ? "YES" : "NO"}\n\n`;

      markdown += `### Proposed Text\n`;
      markdown += `${fencedText(opt.draft_reply || "")}\n\n`;

      markdown += `### Why This May Be Helpful\n`;
      markdown += `- **User Need Addressed:** ${inlineText(opt.user_need)}\n`;
      markdown += `- **Suggested Angle:** ${inlineText(opt.suggested_angle)}\n\n`;

      markdown += `### Required Human Checks Before Public Use\n`;
      markdown += `- [ ] Confirm subreddit/community rules manually.\n`;
      markdown += `- [ ] Confirm the reply is useful without any Gaia link.\n`;
      markdown += `- [ ] Confirm this is not duplicative of another planned reply.\n`;
      markdown += `- [ ] Confirm no login, CAPTCHA, rate-limit, or account warning is present.\n`;
      markdown += `- [ ] Confirm exact text and target URL are approved.\n\n`;

      markdown += `### Options\n`;
      markdown += `- [ ] Approve as-is\n`;
      markdown += `- [ ] Approve with edits\n`;
      markdown += `- [ ] Reject\n`;
      markdown += `- [ ] Needs more research\n\n`;
      markdown += `---\n\n`;
    }

    writeRedacted(filePath, markdown);
    return filePath;
  }
}
