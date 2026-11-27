/**
 * URL checks shared by every adapter that navigates or hands a URL to the OS.
 *
 * Substring checks such as `url.includes("reddit.com")` accept
 * `https://attacker.example/?reddit.com`; host checks must parse the URL and
 * compare the hostname exactly or as a dot-delimited suffix.
 */

export interface UrlCheck {
  ok: boolean;
  reason?: string;
}

export function checkNavigableUrl(raw: string): UrlCheck {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: "URL could not be parsed." };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, reason: `URL scheme '${parsed.protocol}' is not allowed; only http(s) may be opened.` };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, reason: "URLs carrying embedded credentials are not allowed." };
  }

  if (isNonPublicHost(parsed.hostname)) {
    return { ok: false, reason: `Host '${parsed.hostname}' is loopback, private, link-local or internal; only public hosts may be opened.` };
  }

  return { ok: true };
}

/**
 * Literal-address and reserved-name check. The URL parser has already
 * normalised numeric forms ("2130706433", "0x7f.1") to dotted IPv4. This does
 * not resolve DNS, so a public name pointing at a private address is not
 * caught here.
 */
export function isNonPublicHost(rawHost: string): boolean {
  const host = rawHost.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (!host) return true;

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".home.arpa") ||
    host === "metadata.google.internal"
  ) {
    return true;
  }

  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    return isNonPublicIPv4(v4.slice(1).map(Number));
  }

  if (host.includes(":")) {
    // IPv4-mapped IPv6 (::ffff:a.b.c.d or ::ffff:7f00:1)
    const mappedDotted = host.match(/^::ffff:(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (mappedDotted) return isNonPublicIPv4(mappedDotted.slice(1).map(Number));
    const mappedHex = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (mappedHex) {
      const hi = parseInt(mappedHex[1], 16);
      const lo = parseInt(mappedHex[2], 16);
      return isNonPublicIPv4([hi >> 8, hi & 0xff, lo >> 8, lo & 0xff]);
    }
    if (host === "::1" || host === "::") return true;
    const first = parseInt(host.split(":")[0] || "0", 16);
    if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    return false;
  }

  return false;
}

function isNonPublicIPv4([a, b]: number[]): boolean {
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

export function hostMatches(raw: string, domains: string[]): boolean {
  let hostname: string;
  try {
    hostname = new URL(raw).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return false;
  }
  return domains.some((domain) => {
    const d = domain.toLowerCase();
    return hostname === d || hostname.endsWith(`.${d}`);
  });
}
