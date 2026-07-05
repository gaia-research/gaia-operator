import { Finding } from "../../core/types.js";
import { RedditThread } from "../../adapters/reddit/reddit-types.js";

export class RedditScorer {
  static scoreRelevance(thread: RedditThread, queries: string[]): number {
    const textToSearch = `${thread.title} ${thread.selftext} ${thread.subreddit}`.toLowerCase();
    if (queries.length === 0) return 0.5;

    let matchCount = 0;
    for (const query of queries) {
      const parts = query.toLowerCase().split(/\s+/);
      // If any keyword in the query matches
      const hasMatch = parts.every(keyword => textToSearch.includes(keyword));
      if (hasMatch) {
        matchCount += 1;
      }
    }

    const ratio = matchCount / queries.length;
    // Map to 0.1 to 1.0 range
    return Math.min(1.0, Math.max(0.1, Number((0.2 + ratio * 0.8).toFixed(2))));
  }

  static calculateRisk(thread: RedditThread): "low" | "medium" | "high" | "blocked" {
    const sub = thread.subreddit.toLowerCase();
    const title = thread.title.toLowerCase();

    // High risk if subreddit is known to be hostile to promo/bots, or locked
    if (sub === "announcements" || sub === "gaming" || sub === "funny") {
      return "high";
    }

    // Medium risk for standard programming subreddits (moderation is strict)
    if (sub === "reactjs" || sub === "node" || sub === "javascript" || sub === "artificial") {
      return "medium";
    }

    return "low";
  }

  static determineAction(
    relevance: number,
    risk: "low" | "medium" | "high" | "blocked"
  ): "observe" | "draft" | "skip" | "approval_required" {
    if (relevance < 0.3) {
      return "skip";
    }

    if (risk === "high" || risk === "blocked") {
      return "skip";
    }

    if (risk === "medium") {
      return "approval_required";
    }

    return "draft";
  }
}
