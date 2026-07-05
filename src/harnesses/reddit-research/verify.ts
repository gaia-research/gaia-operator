import { InteractionOpportunity } from "../../core/types.js";

export function verifyDrafts(opportunities: InteractionOpportunity[]): string[] {
  const warnings: string[] = [];

  for (const opt of opportunities) {
    if (!opt.draft_reply) {
      warnings.push(`Opportunity '${opt.id}' has no draft reply.`);
      continue;
    }

    const text = opt.draft_reply.toLowerCase();

    // Check for self-promotion rules
    if (text.includes("http") && (text.includes("gaia") || text.includes("github.com/gaia"))) {
      warnings.push(
        `Opportunity '${opt.id}' contains a direct promotional link. Verify this is allowed under the subreddit rules.`
      );
    }

    // Check for length
    if (text.length < 50) {
      warnings.push(`Opportunity '${opt.id}' draft is very short (${text.length} characters). It might look spammy.`);
    }

    // Check for templated speech
    if (
      text.includes("as an ai") ||
      text.includes("delve") ||
      text.includes("furthermore") ||
      text.includes("testament")
    ) {
      warnings.push(`Opportunity '${opt.id}' contains potential AI slop keywords (e.g. 'as an AI', 'delve').`);
    }
  }

  return warnings;
}
