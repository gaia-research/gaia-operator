import { RedditThread, RedditComment } from "./reddit-types.js";
import { BlockedSessionError } from "../../core/errors.js";

function getTransparentUserAgent(): string {
  return process.env.GAIA_OPERATOR_USER_AGENT ||
    "GaiaOperator/0.1.0 (+https://github.com/gaia-research/gaia-operator; public-community-research; contact=unset)";
}

// Only the /r/<sub>/comments/<id> prefix is trusted. Everything after it
// (title slug, query, fragment, "%2e%2e" or other dot segments) is discarded
// and the URL is rebuilt from the two validated parts, so threads with
// non-ASCII slugs are kept and nothing can steer the path or host.
const PERMALINK_PREFIX = /^\/r\/([A-Za-z0-9_]{1,64})\/comments\/([A-Za-z0-9]{1,16})(?:[/?#]|$)/;

export function canonicalPermalink(permalink: unknown): string | null {
  if (typeof permalink !== "string") return null;
  const match = permalink.match(PERMALINK_PREFIX);
  return match ? `/r/${match[1]}/comments/${match[2]}/` : null;
}

export function isSafePermalink(permalink: unknown): permalink is string {
  return canonicalPermalink(permalink) !== null;
}

export class RedditApiAdapter {
  private userAgent: string;

  constructor() {
    this.userAgent = getTransparentUserAgent();
  }

  async searchThreads(query: string, limit = 5): Promise<RedditThread[]> {
    const cleanLimit = Math.max(1, Math.min(limit, 25));
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=${cleanLimit}&sort=relevance&type=link`;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": this.userAgent,
          "Accept": "application/json"
        }
      });

      if (response.status === 429) {
        throw new BlockedSessionError(
          "Reddit public JSON endpoint returned HTTP 429 rate limit. Gaia Operator stopped instead of retrying aggressively.",
          "rate_limit",
          url
        );
      }

      if (response.status === 401 || response.status === 403) {
        throw new BlockedSessionError(
          `Reddit public JSON endpoint returned HTTP ${response.status}. Gaia Operator stopped instead of bypassing access controls.`,
          "human_verification",
          url
        );
      }

      if (!response.ok) {
        console.warn(`[RedditApiAdapter] API request failed with status ${response.status}. Returning no results without mock fallback.`);
        return [];
      }

      const json = await response.json() as any;
      if (!json.data || !Array.isArray(json.data.children)) {
        return [];
      }

      return json.data.children
        // The permalink is concatenated onto the reddit.com origin, so it must
        // be a plain /r/<sub>/comments/... path. "@evil.example/x" would
        // otherwise turn the target URL into a different host.
        .filter((child: any) => child?.kind === "t3" && isSafePermalink(child?.data?.permalink))
        .map((child: any) => {
          const d = child.data;
          return {
            id: String(d.id),
            title: String(d.title || "Untitled Reddit thread"),
            subreddit: String(d.subreddit || "unknown"),
            selftext: String(d.selftext || ""),
            score: Number(d.score || 0),
            url: `https://www.reddit.com${canonicalPermalink(d.permalink)}`,
            author: String(d.author || "unknown"),
            num_comments: Number(d.num_comments || 0),
            created_utc: Number(d.created_utc || 0)
          } satisfies RedditThread;
        });
    } catch (err: any) {
      if (err instanceof BlockedSessionError) {
        throw err;
      }

      const failOnNetworkError = process.env.GAIA_OPERATOR_FAIL_ON_NETWORK_ERROR === "true";
      const message = err?.message || String(err);

      if (failOnNetworkError) {
        throw err;
      }

      console.warn(`[RedditApiAdapter] Network/API error for query '${query}': ${message}. Returning no results without mock fallback.`);
      return [];
    }
  }

  async getComments(threadId: string, subreddit: string): Promise<RedditComment[]> {
    const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/comments/${encodeURIComponent(threadId)}.json`;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": this.userAgent,
          "Accept": "application/json"
        }
      });

      if (response.status === 429) {
        throw new BlockedSessionError(
          "Reddit comments endpoint returned HTTP 429 rate limit. Gaia Operator stopped instead of retrying aggressively.",
          "rate_limit",
          url
        );
      }

      if (!response.ok) {
        return [];
      }

      const json = await response.json() as any;
      if (!Array.isArray(json) || json.length < 2 || !json[1]?.data?.children) {
        return [];
      }

      return json[1].data.children
        .filter((child: any) => child.kind === "t1")
        .map((child: any) => {
          const d = child.data;
          return {
            id: String(d.id),
            author: String(d.author || "unknown"),
            body: String(d.body || ""),
            score: Number(d.score || 0),
            created_utc: Number(d.created_utc || 0)
          } satisfies RedditComment;
        });
    } catch (err: any) {
      if (err instanceof BlockedSessionError) {
        throw err;
      }
      return [];
    }
  }
}
