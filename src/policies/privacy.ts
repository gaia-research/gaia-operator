// Credential shapes that must never reach traces, findings, reports or
// approval cards. Redaction is defence in depth for artifacts; it is not a
// licence to put secrets into the pipeline in the first place.
const TOKEN_PATTERNS: Array<[RegExp, string]> = [
  // Authorization header values (whole value, any scheme)
  [/\b(Authorization|Proxy-Authorization)[ \t]*:[ \t]*[^\s][^\r\n]*/gi, "$1: [REDACTED]"],
  // Bearer/Basic credentials outside a header: require a token-shaped value
  // (has a digit or base64 punctuation) so prose like "Basic authentication"
  // is left alone.
  [/\b(Bearer|Basic)[ \t]+(?=[A-Za-z._~-]*[0-9+\/=])[A-Za-z0-9._~+\/=-]{12,}/g, "$1 [REDACTED]"],
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
  // Credentials embedded in URLs (scheme://user:pass@host)
  // (Quantifiers are bounded: unbounded runs make these quadratic on long
  // hyphen/dot chains in untrusted text.)
  [/\b([a-z][a-z0-9+.-]{0,30}:\/\/)[^\s\/?#@]{1,256}@/gi, "$1[REDACTED]@"],
  // Cookie headers
  [/\b(Cookie|Set-Cookie)[ \t]*:[ \t]*[^\s][^\r\n]*/gi, "$1: [REDACTED]"]
];

const PEM_BEGIN = /-----BEGIN [A-Z ]{0,40}PRIVATE KEY-----/g;
const PEM_END = /^[ \t]*-----END [A-Z ]{0,40}PRIVATE KEY-----/;
const PEM_BODY_LINE = /^[ \t]*(?:[A-Za-z0-9+\/=]+|[A-Za-z-]{1,40}:[^\r\n]*)?[ \t]*$/;

/**
 * Linear line scanner for private-key blocks. The body may only be base64
 * lines (indentation, trailing spaces, blank lines and PEM "Name: value"
 * headers allowed), so a BEGIN in one field can never consume unrelated prose
 * up to an END elsewhere, and an unterminated block still loses its key
 * material. A regex with optional whitespace on both sides of each body line
 * backtracks exponentially on blank lines; this does not.
 */
function redactPrivateKeys(text: string): string {
  if (!text.includes("PRIVATE KEY-----")) return text;
  let out = "";
  let cursor = 0;
  PEM_BEGIN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PEM_BEGIN.exec(text)) !== null) {
    out += text.slice(cursor, match.index);
    let end = match.index + match[0].length;
    // Consume the rest of the BEGIN line.
    const beginLineEnd = text.indexOf("\n", end);
    end = beginLineEnd === -1 ? text.length : beginLineEnd;
    while (end < text.length) {
      const next = text.indexOf("\n", end + 1);
      const line = text.slice(end + 1, next === -1 ? text.length : next).replace(/\r$/, "");
      if (PEM_END.test(line)) {
        end = next === -1 ? text.length : next;
        break;
      }
      if (!PEM_BODY_LINE.test(line)) break;
      end = next === -1 ? text.length : next;
    }
    out += "[PRIVATE_KEY_REDACTED]";
    cursor = end;
    PEM_BEGIN.lastIndex = Math.max(end, match.index + 1);
  }
  return out + text.slice(cursor);
}

export class PrivacyChecker {
  static filterSensitiveData(text: string): string {
    let scrubbed = redactPrivateKeys(text);

    for (const [pattern, replacement] of TOKEN_PATTERNS) {
      scrubbed = scrubbed.replace(pattern, replacement);
    }

    // Scrub emails
    scrubbed = scrubbed.replace(/[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,253}\.[a-zA-Z]{2,24}/g, "[EMAIL_REDACTED]");

    // Scrub credential-named key/value pairs. The name must END in a
    // credential word (any prefix, incl. camelCase: accessToken, clientSecret),
    // so "max_tokens: 4096" and "secretary: x" survive.
    scrubbed = scrubbed.replace(
      /\b([A-Za-z0-9_-]{0,64}?(?:password|passwd|passphrase|pwd|secret|api[_-]?key|access[_-]?key|secret[_-]?key|private[_-]?key|token|session[_-]?id))(["']?)[ \t]*[:=][ \t]*("[^"\r\n]*"|'[^'\r\n]*'|[^\s&"',}]+)/gi,
      (_m, name: string, quote: string, value: string) => {
        const q = value.startsWith('"') ? '"' : value.startsWith("'") ? "'" : "";
        return `${name}${quote}${quote ? ": " : "="}${q}[REDACTED]${q}`;
      }
    );
    // Bare "key": the "=" form (e.g. ?key=... in query strings) always; the
    // ":" form only with a token-shaped value, so prose like "The key: use
    // structured state" is untouched.
    scrubbed = scrubbed.replace(/([?&\s]|^)key=[^\s&"]+/gim, "$1key=[REDACTED]");
    scrubbed = scrubbed.replace(/\b(key)[ \t]*:[ \t]*(?=[^\s&"]*\d)[^\s&"]{12,}/gi, "$1=[REDACTED]");

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
const SECRET_KEY_NAME = /(password|passwd|passphrase|pwd|secret|token|api[_-]?key|access[_-]?key|secret[_-]?key|private[_-]?key|authorization|cookies?|session[_-]?id|credentials?)$/i;

function redactValue(value: unknown, keyName: string | undefined): unknown {
  // A secret-named key is blanked whatever its value's type: an array of
  // cookies or a credentials object is as sensitive as a string.
  if (keyName && SECRET_KEY_NAME.test(keyName) && value !== null && value !== undefined && value !== "") {
    return "[REDACTED]";
  }
  if (typeof value === "string") {
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
