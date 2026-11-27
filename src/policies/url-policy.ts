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

  return { ok: true };
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
