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
    
    // 1. Summary
    md += `## Summary\n`;
    md += `- **Task ID:** ${task.id}\n`;
    md += `- **Date:** ${timestamp}\n`;
    md += `- **Mode:** ${task.mode}\n`;
    md += `- **Risk Ceiling Used:** ${task.risk_ceiling}\n`;
    md += `- **Status:** ${blockedText ? "BLOCKED/INCOMPLETE" : "COMPLETED"}\n\n`;
    
    md += `This report lists AI agent and browser automation pain points extracted from Reddit discussion threads.\n\n`;

    // 2. Platforms Inspected
    md += `## Platforms Inspected\n`;
    for (const platform of task.platforms) {
      md += `- **${platform.toUpperCase()}** (using safe access protocols)\n`;
    }
    md += `\n`;

    // 3. Key Findings
    md += `## Key Findings\n`;
    if (findings.length === 0) {
      md += `_No findings collected._\n`;
    } else {
      for (const f of findings) {
        md += `### ${f.title || "Reddit Post"}\n`;
        md += `- **URL:** ${f.url}\n`;
        md += `- **Subreddit:** r/${f.community || "unknown"}\n`;
        md += `- **Relevance Score:** ${f.relevance_score}\n`;
        md += `- **Risk Level:** ${f.interaction_risk}\n`;
        md += `- **Summary:** ${f.summary}\n`;
        if (f.excerpt) {
          md += `> ${f.excerpt}\n`;
        }
        md += `\n`;
      }
    }

    // 4. Community Norms
    md += `## Community Norms\n`;
    md += `Reddit rules require transparent and helpful communication. Mass engagement or automated promotion is prohibited.\n`;
    md += `- Self-promotion rules must be respected in subreddits like r/node and r/reactjs.\n`;
    md += `- Helpful posts adding direct technical value are preferred.\n\n`;

    // 5. Opportunities
    md += `## Opportunities\n`;
    if (opportunities.length === 0) {
      md += `_No public interaction opportunities identified._\n`;
    } else {
      for (const opt of opportunities) {
        md += `- **Opportunity ${opt.id}:** Assist user in r/${opt.community} facing issues: *"${opt.user_need}"*.\n`;
      }
      md += `\n`;
    }

    // 6. Draft Replies
    md += `## Draft Replies\n`;
    if (opportunities.length === 0) {
      md += `_No replies drafted._\n`;
    } else {
      for (const opt of opportunities) {
        md += `### Draft for ${opt.id} (r/${opt.community})\n`;
        md += `**Suggested Angle:** ${opt.suggested_angle}\n`;
        md += `**Voice Status:** ${opt.nova_voice_status}\n`;
        md += `\`\`\`text\n${opt.draft_reply}\n\`\`\`\n\n`;
      }
    }

    // 7. Risks and Blocks
    md += `## Risks and Blocks\n`;
    if (blockedText) {
      md += `### Warning: Session Blocked\n`;
      md += `${blockedText}\n\n`;
    } else {
      md += `No account challenges, CAPTCHAs, or rate limits were encountered during this run.\n\n`;
    }

    // 8. Recommended Next Actions
    md += `## Recommended Next Actions\n`;
    if (opportunities.length > 0) {
      md += `1. Review the generated draft replies in \`draft-replies.md\`.\n`;
      md += `2. If any draft is acceptable, complete manual posting or request L4 publish approval.\n`;
    } else {
      md += `1. Refine target search queries in the task file.\n`;
    }
    md += `2. Sync results back to marketing tasks.\n\n`;

    // 9. Evidence Index
    md += `## Evidence Index\n`;
    for (const f of findings) {
      md += `- **[Finding ${f.id}]** URL: ${f.url} (Relevance: ${f.relevance_score})\n`;
      for (const ref of f.evidence_refs) {
        md += `  - Evidence: ${ref}\n`;
      }
    }
    
    return md;
  }
}
