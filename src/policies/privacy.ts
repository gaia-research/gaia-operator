// Credential shapes that must never reach traces, findings, reports or
// approval cards. Redaction is defence in depth for artifacts; it is not a
// licence to put secrets into the pipeline in the first place.
const TOKEN_PATTERNS: Array<[RegExp, string]> = [
  // HTTP authorization headers / bearer tokens
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+\/=-]{8,}/g, "$1 [REDACTED]"],
  // GitHub tokens (classic and fine-grained)
  [/\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, "[TOKEN_REDACTED]"],
  // Slack tokens
  [/\bxox[abposr]-[A-Za-z0-9-]{10,}\b/g, "[TOKEN_REDACTED]"],
  // AWS access key ids
  [/\b(AKIA|ASIA)[A-Z0-9]{16}\b/g, "[TOKEN_REDACTED]"],
  // OpenAI/Anthropic-style secret keys
  [/\bsk-(?:ant-)?[A-Za-z0-9_-]{16,}\b/g, "[TOKEN_REDACTED]"],
  // JSON Web Tokens
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[TOKEN_REDACTED]"],
  // Private key blocks
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[PRIVATE_KEY_REDACTED]"],
  // Cookie headers
  [/\b(Cookie|Set-Cookie)\s*:\s*[^\r\n]+/gi, "$1: [REDACTED]"]
];

export class PrivacyChecker {
  static filterSensitiveData(text: string): string {
    let scrubbed = text;

    for (const [pattern, replacement] of TOKEN_PATTERNS) {
      scrubbed = scrubbed.replace(pattern, replacement);
    }

    // Scrub emails
    scrubbed = scrubbed.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_REDACTED]");

    // Scrub potential passwords/keys in queries and key=value text
    scrubbed = scrubbed.replace(
      /\b([\w-]*(?:password|passwd|secret|api_?key|access_?key|token|session_?id)[\w-]*)\s*[:=]\s*[^\s&"]+/gi,
      "$1=[REDACTED]"
    );

    return scrubbed;
  }

  /**
   * Redact every string inside a JSON-compatible value, including object keys'
   * values at any depth. Keys whose name indicates a secret are blanked.
   */
  static redactDeep<T>(value: T): T {
    return redactValue(value, undefined) as T;
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

const SECRET_KEY_NAME = /(password|passwd|secret|token|api[_-]?key|authorization|cookie|session|credential|private[_-]?key)/i;

function redactValue(value: unknown, keyName: string | undefined): unknown {
  if (typeof value === "string") {
    if (keyName && SECRET_KEY_NAME.test(keyName) && value.length > 0) {
      return "[REDACTED]";
    }
    return PrivacyChecker.filterSensitiveData(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, undefined));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactValue(v, k);
    }
    return out;
  }
  return value;
}
