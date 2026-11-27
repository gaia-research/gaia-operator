// Credential shapes that must never reach traces, findings, reports or
// approval cards. Redaction is defence in depth for artifacts; it is not a
// licence to put secrets into the pipeline in the first place.
const TOKEN_PATTERNS: Array<[RegExp, string]> = [
  // Authorization header values (whole value, any scheme)
  [/\b(Authorization|Proxy-Authorization)\s*:\s*[^\r\n]+/gi, "$1: [REDACTED]"],
  // Bearer/Basic credentials outside a header: require a token-shaped value
  // (has a digit or base64 punctuation) so prose like "Basic authentication"
  // is left alone.
  [/\b(Bearer|Basic)\s+(?=[A-Za-z._~-]*[0-9+\/=])[A-Za-z0-9._~+\/=-]{12,}/g, "$1 [REDACTED]"],
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
  // Private key blocks. The body may only be base64 lines, so a BEGIN in one
  // field can never consume unrelated text up to an END elsewhere; an
  // unterminated block still loses its key material.
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----(?:\r?\n[A-Za-z0-9+\/=]+)*(?:\r?\n?-----END [A-Z ]*PRIVATE KEY-----)?/g, "[PRIVATE_KEY_REDACTED]"],
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

    // Scrub credential-named key/value pairs. The name must END in a
    // credential word (any prefix, incl. camelCase: accessToken, clientSecret),
    // so "max_tokens: 4096" and "secretary: x" survive.
    scrubbed = scrubbed.replace(
      /\b([A-Za-z0-9_-]*?(?:password|passwd|secret|api[_-]?key|access[_-]?key|secret[_-]?key|private[_-]?key|token|session[_-]?id))\s*[:=]\s*[^\s&"]+/gi,
      "$1=[REDACTED]"
    );
    // Bare "key": the "=" form (e.g. ?key=... in query strings) always; the
    // ":" form only with a token-shaped value, so prose like "The key: use
    // structured state" is untouched.
    scrubbed = scrubbed.replace(/([?&\s]|^)key=[^\s&"]+/gim, "$1key=[REDACTED]");
    scrubbed = scrubbed.replace(/\b(key)\s*:\s*(?=[^\s&"]*\d)[^\s&"]{12,}/gi, "$1=[REDACTED]");

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

// The key name must END in a credential word (snake, kebab or camelCase):
// "accessToken", "client_secret", "set-cookie" are blanked; "session_mode",
// "cookie_banner", "max_tokens" are evidence and kept.
const SECRET_KEY_NAME = /(password|passwd|secret|token|api[_-]?key|authorization|cookies?|session[_-]?id|credentials?|private[_-]?key)$/i;

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
