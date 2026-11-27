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
 * normalised numeric forms ("2130706433", "0x7f.1") to dotted IPv4 and IPv6 to
 * compressed hex. This does not resolve DNS, so a public name pointing at a
 * private address is not caught here.
 */
export function isNonPublicHost(rawHost: string): boolean {
  const host = rawHost.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (!host) return true;

  if (host.includes(":")) {
    const hextets = expandIPv6(host);
    return hextets === null ? true : isNonPublicIPv6(hextets);
  }

  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    return isNonPublicIPv4(v4.slice(1).map(Number));
  }

  // Single-label names ("intranet", "router") only resolve on local search
  // domains; reserved suffixes are internal by definition.
  if (!host.includes(".")) return true;
  return (
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".intranet") ||
    host.endsWith(".lan") ||
    host.endsWith(".home") ||
    host.endsWith(".corp") ||
    host.endsWith(".svc") ||
    host.endsWith(".localdomain") ||
    host.endsWith(".home.arpa")
  );
}

function isNonPublicIPv4([a, b, c]: number[]): boolean {
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||     // CGNAT
    (a === 169 && b === 254) ||               // link-local / cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) || // IETF protocol / TEST-NET-1
    (a === 192 && b === 88 && c === 99) ||    // deprecated 6to4 relay anycast
    (a === 198 && (b === 18 || b === 19)) ||  // benchmarking
    (a === 198 && b === 51 && c === 100) ||   // TEST-NET-2
    (a === 203 && b === 0 && c === 113) ||    // TEST-NET-3
    a >= 224                                  // multicast / reserved / broadcast
  );
}

function expandIPv6(host: string): number[] | null {
  let text = host.split("%")[0];
  // Trailing dotted IPv4 ("::ffff:1.2.3.4") -> two hextets.
  const dotted = text.match(/^(.*:)(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (dotted) {
    const [a, b, c, d] = dotted.slice(2).map(Number);
    text = `${dotted[1]}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0 || (halves.length === 1 && head.length !== 8)) return null;
  const parts = [...head, ...Array(fill).fill("0"), ...tail];
  if (parts.length !== 8 || parts.some((p) => !/^[0-9a-f]{1,4}$/.test(p))) return null;
  return parts.map((p) => parseInt(p, 16));
}

function isNonPublicIPv6(h: number[]): boolean {
  const embeddedV4 = () => [h[6] >> 8, h[6] & 0xff, h[7] >> 8, h[7] & 0xff];
  const firstFiveZero = h.slice(0, 5).every((x) => x === 0);

  if (h.every((x) => x === 0)) return true;                                   // ::
  if (firstFiveZero && h[5] === 0 && h[6] === 0 && h[7] === 1) return true;   // ::1
  if (firstFiveZero && h[5] === 0xffff) return isNonPublicIPv4(embeddedV4()); // ::ffff:a.b.c.d
  if (firstFiveZero && h[5] === 0) return true;                               // deprecated ::a.b.c.d
  if (h.slice(0, 4).every((x) => x === 0) && h[4] === 0xffff && h[5] === 0) {
    return isNonPublicIPv4(embeddedV4());                                     // ::ffff:0:a.b.c.d (IPv4-translated)
  }
  if (h[0] === 0x2002) {
    return isNonPublicIPv4([h[1] >> 8, h[1] & 0xff, h[2] >> 8, h[2] & 0xff]); // 6to4 2002:V4ADDR::/48
  }
  if (h[0] === 0x2001 && h[1] === 0) return true;                             // Teredo 2001::/32 tunnel
  if (h[0] === 0x64 && h[1] === 0xff9b && h.slice(2, 6).every((x) => x === 0)) {
    return isNonPublicIPv4(embeddedV4());                                     // NAT64 64:ff9b::/96
  }
  if (h[0] === 0x64 && h[1] === 0xff9b && h[2] === 1) return true;            // local-use NAT64 64:ff9b:1::/48
  if (h[0] === 0x0100 && h.slice(1, 4).every((x) => x === 0)) return true; // 100::/64 discard
  if ((h[0] & 0xfe00) === 0xfc00) return true;  // fc00::/7 unique local
  if ((h[0] & 0xffc0) === 0xfe80) return true;  // fe80::/10 link-local
  if ((h[0] & 0xffc0) === 0xfec0) return true;  // fec0::/10 site-local (deprecated)
  if ((h[0] & 0xff00) === 0xff00) return true;  // ff00::/8 multicast
  if (h[0] === 0x2001 && h[1] === 0x0db8) return true; // documentation
  if (h[0] === 0x2001 && h[1] === 0x0002 && h[2] === 0) return true; // benchmarking 2001:2::/48
  if (h[0] === 0x2001 && (h[1] & 0xfff0) === 0x0020) return true;    // ORCHIDv2 2001:20::/28
  return false;
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

// Account/private routes on the platforms Operator works with, as route
// prefixes per platform (not any segment anywhere: a Reddit thread slug
// "/chat/" or a GitHub repo named "settings" is public content).
type RouteRule = (segments: string[]) => boolean;
const first = (names: string[]): RouteRule => (seg) => names.includes(seg[0] ?? "");

const PLATFORM_PRIVATE_ROUTES: Array<{ domains: string[]; rule: RouteRule }> = [
  {
    domains: ["reddit.com"],
    rule: (seg) =>
      first(["message", "messages", "settings", "prefs", "account", "chat", "notifications", "inbox", "login", "register"])(seg) ||
      ((seg[0] === "user" || seg[0] === "u") && ["saved", "hidden", "upvoted", "downvoted"].includes(seg[2] ?? ""))
  },
  { domains: ["x.com", "twitter.com"], rule: (seg) => first(["messages", "settings", "notifications", "login", "account"])(seg) || (seg[0] === "i" && ["bookmarks", "notifications", "flow", "account_access", "chat", "messages"].includes(seg[1] ?? "")) },
  { domains: ["linkedin.com"], rule: first(["messaging", "settings", "psettings", "notifications", "mynetwork", "login", "checkpoint"]) },
  { domains: ["github.com"], rule: first(["settings", "notifications", "login", "sessions"]) },
  { domains: ["discord.com", "discordapp.com"], rule: (seg) => (seg[0] === "channels" && seg[1] === "@me") || first(["login", "settings"])(seg) },
  { domains: ["youtube.com"], rule: (seg) => first(["account"])(seg) || (seg[0] === "feed" && ["history", "library", "subscriptions"].includes(seg[1] ?? "")) },
  { domains: ["ycombinator.com"], rule: first(["login"]) }
];

export function isPrivateAccountUrl(raw: string): boolean {
  let segments: string[];
  try {
    // pathname is not percent-decoded ("/%6Dessage/inbox"); decode each
    // segment, and treat an undecodable one as private (fail closed).
    segments = new URL(raw).pathname.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment).toLowerCase());
  } catch {
    return true;
  }
  return PLATFORM_PRIVATE_ROUTES.some(({ domains, rule }) => hostMatches(raw, domains) && rule(segments));
}
