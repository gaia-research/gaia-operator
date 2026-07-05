import { OperatorTask, Finding, InteractionOpportunity } from "../../core/types.js";

export class RedditReportBuilder {
  static build(
    task: OperatorTask,
    findings: Finding[],
    opportunities: InteractionOpportunity[],
    blockedText?: string
  ): string {
    const timestamp = new Date().toISOString();

    let md = `# Report: ${task.title}\n\n`;

    md += `## Summary\n`;
    md += `- **Task ID:** ${task.id}\n`;
    md += `- **Date:** ${timestamp}\n`;
    md += `- **Mode:** ${task.mode}\n`;
    md += `- **Risk Ceiling Used:** ${task.risk_ceiling}\n`;
    md += `- **Public Actions Taken:** 0\n`;
    md += `- **Status:** ${blockedText ? "BLOCKED/INCOMPLETE" : "COMPLETED"}\n\n`;
    md += `This report covers public community research and draft-only interaction opportunities. It does not claim that any public reply, vote, message, join, or account action was taken.\n\n`;

    md += `## Platforms Inspected\n`;
    for (const platform of task.platforms) {
      md += `- **${platform.toUpperCase()}**\n`;
    }
    md += `\n`;

    md += `## Methodology\n`;
    md += `Gaia Operator uses API or structured public access first, browser inspection second, and computer-use fallback only for visual/manual review. If a login challenge, CAPTCHA, rate limit, account warning, or unclear community rule appears, the run must stop and write a blocked-state report.\n\n`;

    md += `## Key Findings\n`;
    if (findings.length === 0) {
      md += `_No findings collected. The runtime did not fabricate live-looking findings from mocks._\n\n`;
    } else {
      for (const f of findings) {
        md += `### ${f.title || "Reddit Post"}\n`;
        md += `- **URL:** ${f.url}\n`;
        md += `- **Subreddit:** r/${f.community || "unknown"}\n`;
        md += `- **Relevance Score:** ${f.relevance_score}\n`;
        md += `- **Risk Level:** ${f.interaction_risk}\n`;
        md += `- **Recommended Action:** ${f.recommended_action}\n`;
        md += `- **Summary:** ${f.summary}\n`;
        if (f.excerpt) {
          md += `> ${f.excerpt}\n`;
        }
        md += `\n`;
      }
    }

    md += `## Community Norms\n`;
    md += `- Assume subreddit-specific rules must be checked before any public reply.\n`;
    md += `- Avoid repeated wording, unsolicited promotion, private outreach, vote automation, and link-first replies.\n`;
    md += `- Drafts should remain helpful even when every Gaia-related link is removed.\n`;
    md += `- MVP does not auto-post. Human review is required before public interaction.\n\n`;

    md += `## Opportunities\n`;
    if (opportunities.length === 0) {
      md += `_No public interaction opportunities identified._\n\n`;
    } else {
      for (const opt of opportunities) {
        md += `- **${opt.id}:** r/${opt.community}, risk ${opt.risk_level}, approval required: ${opt.approval_required ? "yes" : "no"}.\n`;
      }
      md += `\n`;
    }

    md += `## Draft Replies\n`;
    if (opportunities.length === 0) {
      md += `_No replies drafted._\n\n`;
    } else {
      for (const opt of opportunities) {
        md += `### Draft for ${opt.id} (r/${opt.community})\n`;
        md += `**Suggested Angle:** ${opt.suggested_angle}\n\n`;
        md += `**Voice Status:** ${opt.nova_voice_status}\n\n`;
        md += `\`\`\`text\n${opt.draft_reply}\n\`\`\`\n\n`;
      }
    }

    md += `## Risks and Blocks\n`;
    if (blockedText) {
      md += `### Session Blocked\n`;
      md += `${blockedText}\n\n`;
    } else {
      md += `No block was recorded by the runtime. Human reviewers should still check target community rules before any public action.\n\n`;
    }

    md += `## Recommended Next Actions\n`;
    if (opportunities.length > 0) {
      md += `1. Review \`draft-replies.md\` and \`approval-request.md\` if present.\n`;
      md += `2. Confirm subreddit rules manually before any public interaction.\n`;
      md += `3. Post manually or through a separately approved L4 flow only after exact-text approval.\n`;
    } else {
      md += `1. Refine target search queries in the task file.\n`;
      md += `2. Re-run in observe-only mode if the platform appears sensitive or rate-limited.\n`;
    }
    md += `3. Sync results back to marketing-tasks.\n\n`;

    md += `## Evidence Index\n`;
    if (findings.length === 0) {
      md += `_No evidence references._\n`;
    } else {
      for (const f of findings) {
        md += `- **${f.id}:** ${f.url}\n`;
        for (const ref of f.evidence_refs) {
          md += `  - ${ref}\n`;
        }
      }
    }

    return md;
  }
}
