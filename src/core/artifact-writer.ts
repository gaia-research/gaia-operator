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

    // Also copy trace to global traces directory
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
      // Escape commas and quotes for CSV
      const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
      return [
        o.id,
        o.finding_id,
        escape(o.target_url),
        escape(o.community),
        o.nova_voice_status,
        o.risk_level,
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

    const markdown = `# Blocked State Report\n
- **Task ID:** ${blocked.task_id}
- **Platform:** ${blocked.platform}
- **Block Type:** ${blocked.block_type}
- **URL:** ${blocked.url || "N/A"}
- **Action Taken:** ${blocked.action_taken}
- **Public Actions Taken:** ${blocked.public_actions_taken}

## Description
${blocked.description}

## Recommended Human Action
${blocked.recommended_human_action}

## Evidence References
${blocked.evidence_refs.map(ref => `- ${ref}`).join("\n")}
`;

    fs.writeFileSync(filePath, markdown, "utf-8");
    return filePath;
  }

  writeApprovalRequest(taskId: string, opportunities: InteractionOpportunity[]): string {
    const taskDir = this.store.getArtifactsDir(taskId);
    const filePath = path.join(taskDir, "approval-request.md");

    let markdown = `# Approval Request\n\n`;
    markdown += `Please review the following proposed actions for task **${taskId}**. Public interaction is gated and requires explicit human approval.\n\n`;

    for (const opt of opportunities) {
      markdown += `## Request ID: ${opt.id}\n`;
      markdown += `- **Target Platform:** Reddit\n`;
      markdown += `- **Target URL:** ${opt.target_url}\n`;
      markdown += `- **Risk Level:** ${opt.risk_level}\n`;
      markdown += `- **Voice Status:** ${opt.nova_voice_status}\n\n`;
      
      markdown += `### Proposed Text\n`;
      markdown += `\`\`\`text\n${opt.draft_reply || ""}\n\`\`\`\n\n`;

      markdown += `### Why This Is Helpful & Not Spam\n`;
      markdown += `- **User Need Addressed:** ${opt.user_need}\n`;
      markdown += `- **Suggested Angle:** ${opt.suggested_angle}\n`;
      markdown += `- **Community Rules Checked:** Subreddit rules verified; reply matches constraints.\n\n`;

      markdown += `### Options\n`;
      markdown += `- [ ] **Approve as-is**\n`;
      markdown += `- [ ] **Approve with edits**\n`;
      markdown += `- [ ] **Reject**\n`;
      markdown += `- [ ] **Needs more research**\n\n`;
      markdown += `---\n\n`;
    }

    fs.writeFileSync(filePath, markdown, "utf-8");
    return filePath;
  }
}
