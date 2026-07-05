import { Finding, InteractionOpportunity } from "../core/types.js";

export class ReplyDrafter {
  draftResponse(finding: Finding, personaContent?: string): InteractionOpportunity {
    console.log(`[ReplyDrafter] Drafting response for finding: ${finding.id}`);
    
    let draft_reply = `Hi, I noticed you are hitting issues with ${finding.title}. Implementing standard rate limits and API-first designs is usually more robust than raw screen scrapping.`;
    
    if (personaContent) {
      draft_reply = `[Nova Persona Applied] ${draft_reply}`;
    }

    return {
      id: `opportunity_drafter_${finding.id}`,
      finding_id: finding.id,
      target_url: finding.url,
      community: finding.community || "unknown",
      user_need: finding.title || "Help needed",
      suggested_angle: "Provide technical rate-limiting advice.",
      draft_reply,
      nova_voice_status: personaContent ? "applied" : "neutral_fallback",
      risk_level: "L2",
      approval_required: true
    };
  }
}
