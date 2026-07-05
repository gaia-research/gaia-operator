import * as fs from "fs";
import * as path from "path";
import { StateStore } from "./state-store.js";
import { Trace, Finding, InteractionOpportunity, BlockedState } from "./types.js";

export class ArtifactWriter {
  private store: StateStore;

  constructor(store: StateStore) {
    this.store = store;
  }

  writeTrace(taskId: string, trace: Trace): string {
    const taskDir = this.store.getArtifactsDir(taskId);
    const tracePath = path.join(taskDir, "trace.json");
    fs.writeFileSync(tracePath, JSON.stringify(trace, null, 2), "utf-8");

    const globalTracePath = path.join(this.store.getTracesDir(), `${taskId}_trace.json`);
    fs.writeFileSync(globalTracePath, JSON.stringify(trace, null, 2), "utf-8");

    return tracePath;
  }

  writeFindingsJsonl(taskId: string, findings: Finding[]): string {
    const taskDir = this.store.getArtifactsDir(taskId);
    const filePath = path.join(taskDir, "findings.jsonl");
    const content = findings.map(f => JSON.stringify(f)).join("\n");
    fs.writeFileSync(filePath, content, "utf-8");
    return filePath;
  }

  writeOpportunitiesCsv(taskId: string, opportunities: InteractionOpportunity[]): string {
    const taskDir = this.store.getArtifactsDir(taskId);
    const filePath = path.join(taskDir, "opportunities.csv");

    const headers = "id,finding_id,target_url,community,nova_voice_status,risk_level,approval_required\n";
    const rows = opportunities.map(o => {
      const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
      return [
        escape(o.id),
        escape(o.finding_id),
        escape(o.target_url),
        escape(o.community),
        escape(o.nova_voice_status),
        escape(o.risk_level),
        o.approval_required ? "true" : "false"
      ].join(",");
    }).join("\n");

    fs.writeFileSync(filePath, headers + rows, "utf-8");
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
        markdown += `## Opportunity: ${opt.id}\n`;
        markdown += `- **Target URL:** ${opt.target_url}\n`;
        markdown += `- **Community:** ${opt.community}\n`;
        markdown += `- **User Need:** ${opt.user_need}\n`;
        markdown += `- **Suggested Angle:** ${opt.suggested_angle}\n`;
        markdown += `- **Voice Status:** ${opt.nova_voice_status}\n`;
        markdown += `- **Risk Level:** ${opt.risk_level}\n`;
        markdown += `- **Approval Required:** ${opt.approval_required ? "YES" : "NO"}\n\n`;
        markdown += `### Draft Reply Text\n\`\`\`text\n${opt.draft_reply || "(Empty draft)"}\n\`\`\`\n\n`;
        markdown += `---\n\n`;
      }
    }

    fs.writeFileSync(filePath, markdown, "utf-8");
    return filePath;
  }

  writeMarkdownReport(taskId: string, reportContent: string): string {
    const taskDir = this.store.getArtifactsDir(taskId);
    const filePath = path.join(taskDir, "report.md");
    fs.writeFileSync(filePath, reportContent, "utf-8");
    return filePath;
  }

  writeBlockedState(taskId: string, blocked: BlockedState): string {
    const taskDir = this.store.getArtifactsDir(taskId);
    const filePath = path.join(taskDir, "blocked-state.md");

    const markdown = `# Blocked State Report\n\n- **Task ID:** ${blocked.task_id}\n- **Platform:** ${blocked.platform}\n- **Block Type:** ${blocked.block_type}\n- **URL:** ${blocked.url || "N/A"}\n- **Action Taken:** ${blocked.action_taken}\n- **Public Actions Taken:** ${blocked.public_actions_taken}\n\n## Description\n${blocked.description}\n\n## Recommended Human Action\n${blocked.recommended_human_action}\n\n## Evidence References\n${blocked.evidence_refs.length > 0 ? blocked.evidence_refs.map(ref => `- ${ref}`).join("\n") : "_No evidence references captured._"}\n`;

    fs.writeFileSync(filePath, markdown, "utf-8");
    return filePath;
  }

  writeApprovalRequest(taskId: string, opportunities: InteractionOpportunity[]): string {
    const taskDir = this.store.getArtifactsDir(taskId);
    const filePath = path.join(taskDir, "approval-request.md");

    let markdown = `# Approval Request\n\n`;
    markdown += `Review the proposed draft-only actions for task **${taskId}**. Gaia Operator did not post, message, vote, join, or publish anything.\n\n`;

    for (const opt of opportunities) {
      markdown += `## Request ID: ${opt.id}\n`;
      markdown += `- **Target Platform:** Reddit\n`;
      markdown += `- **Target URL:** ${opt.target_url}\n`;
      markdown += `- **Risk Level:** ${opt.risk_level}\n`;
      markdown += `- **Voice Status:** ${opt.nova_voice_status}\n`;
      markdown += `- **Approval Required:** ${opt.approval_required ? "YES" : "NO"}\n\n`;

      markdown += `### Proposed Text\n`;
      markdown += `\`\`\`text\n${opt.draft_reply || ""}\n\`\`\`\n\n`;

      markdown += `### Why This May Be Helpful\n`;
      markdown += `- **User Need Addressed:** ${opt.user_need}\n`;
      markdown += `- **Suggested Angle:** ${opt.suggested_angle}\n\n`;

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

    fs.writeFileSync(filePath, markdown, "utf-8");
    return filePath;
  }
}
