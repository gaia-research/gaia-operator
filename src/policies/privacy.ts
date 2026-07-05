export class PrivacyChecker {
  static filterSensitiveData(text: string): string {
    // Basic scrubbing of potential emails, phone numbers, or passwords from logs
    let scrubbed = text;
    
    // Scrub emails
    scrubbed = scrubbed.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_REDACTED]");
    
    // Scrub potential passwords in queries
    scrubbed = scrubbed.replace(/(password|passwd|secret|key|token|auth_token)\s*[:=]\s*[^\s&"]+/gi, "$1=[REDACTED]");
    
    return scrubbed;
  }

  static isPublicContentAllowed(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    
    // Block URLs that look like private chats, direct messages, settings, etc.
    if (
      lowerUrl.includes("/messages/") ||
      lowerUrl.includes("/direct/") ||
      lowerUrl.includes("/settings") ||
      lowerUrl.includes("/preferences") ||
      lowerUrl.includes("/inbox") ||
      lowerUrl.includes("/private/")
    ) {
      return false;
    }
    
    return true;
  }
}
