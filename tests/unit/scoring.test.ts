import { describe, it, expect } from "vitest";
import { RedditScorer } from "../../src/harnesses/reddit-research/scoring.js";
import { RedditThread } from "../../src/adapters/reddit/reddit-types.js";

describe("Reddit Scorer", () => {
  const dummyThread: RedditThread = {
    id: "t_test",
    title: "Struggling with browser agents and Playwright blocking",
    subreddit: "node",
    selftext: "How do you run Playwright without getting blocked by Reddit?",
    score: 10,
    url: "https://www.reddit.com/r/node/comments/test",
    author: "user_test",
    num_comments: 3,
    created_utc: 123456789
  };

  it("should score relevance higher when queries match", () => {
    const scoreMatched = RedditScorer.scoreRelevance(dummyThread, [
      "browser agent",
      "Playwright blocking"
    ]);
    const scoreNotMatched = RedditScorer.scoreRelevance(dummyThread, [
      "unrelated topics",
      "python programming"
    ]);

    expect(scoreMatched).toBeGreaterThan(scoreNotMatched);
    expect(scoreMatched).toBe(1.0);
  });

  it("should calculate correct risk and action recommendations", () => {
    const risk = RedditScorer.calculateRisk(dummyThread);
    expect(risk).toBe("medium"); // node subreddit has strict moderation

    const action = RedditScorer.determineAction(1.0, risk);
    expect(action).toBe("approval_required");
  });
});
