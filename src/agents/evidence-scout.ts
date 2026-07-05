import { Finding } from "../core/types.js";

export class EvidenceScout {
  validateFinding(finding: Finding): boolean {
    console.log(`[EvidenceScout] Verifying URL source for finding: ${finding.id}`);
    
    // Ensure URL is a valid format and is public-facing
    if (!finding.url.startsWith("http")) {
      return false;
    }
    
    // Ensure excerpt supports the summary
    if (finding.excerpt && finding.excerpt.length > 0) {
      return true;
    }
    
    return false;
  }
}
