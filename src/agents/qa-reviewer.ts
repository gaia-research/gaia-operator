import { InteractionOpportunity } from "../core/types.js";

export class QaReviewer {
  reviewOpportunity(opt: InteractionOpportunity): { passed: boolean; reasons: string[] } {
    console.log(`[QaReviewer] QA checking opportunity: ${opt.id}`);
    
    const reasons: string[] = [];
    let passed = true;

    if (!opt.draft_reply) {
      passed = false;
      reasons.push("Draft reply text is completely empty.");
    } else {
      const text = opt.draft_reply.toLowerCase();
      // Check for overly promotional language
      if (text.includes("buy") || text.includes("checkout our product") || text.includes("exclusive offer")) {
        passed = false;
        reasons.push("Draft contains aggressive sales or promotional language.");
      }
    }

    return { passed, reasons };
  }
}
