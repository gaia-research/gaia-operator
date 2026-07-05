import { MobileHandoffTask } from "./prepare.js";

/**
 * Generates the Markdown approval card text.
 */
export function generateHandoffCard(task: MobileHandoffTask, draftText: string): string {
  const platformName = task.platform.charAt(0).toUpperCase() + task.platform.slice(1);
  const communityStr = task.target.community || "N/A";
  const contextStr = task.target.context_summary || "No context summary provided.";
  
  return `# Mobile Handoff: ${platformName} Reply

## Target
Platform: ${platformName}
Community: ${communityStr}
URL: ${task.target.url}

## Context
${contextStr}

## Draft
\`\`\`text
${draftText}
\`\`\`

## Why This Is Safe
- Specific to the thread
- Not mass-posted
- No unsolicited DM
- No auto-post
- Human final review required

## Before Posting
- Read the thread
- Check platform/community rules
- Edit if needed
- Do not post if it feels promotional

## Result
Run one:
\`\`\`bash
gaia-mobile result ${task.id} --status posted
gaia-mobile result ${task.id} --status rejected
gaia-mobile result ${task.id} --status saved
\`\`\`
`;
}

/**
 * Generates a blocked state Markdown document when guardrails fail.
 */
export function generateBlockedCard(task: MobileHandoffTask, violations: string[]): string {
  const platformName = task.platform.charAt(0).toUpperCase() + task.platform.slice(1);
  
  return `# Mobile Handoff BLOCKED: ${platformName} Reply

## Target
Platform: ${platformName}
URL: ${task.target.url}

## Guardrail Violations
${violations.map(v => `- ${v}`).join("\n")}

## Security Action Taken
- Handoff processes have been halted.
- Clipboard was NOT written.
- Target URL was NOT opened.
- Notification was NOT sent.

## Recommendation
Review task specifications or adjust constraints to follow security guardrails.
`;
}
