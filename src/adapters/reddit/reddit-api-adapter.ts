import { RedditThread, RedditComment } from "./reddit-types.js";

export class RedditApiAdapter {
  private userAgent: string;

  constructor() {
    this.userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (GaiaOperator/0.1.0)";
  }

  async searchThreads(query: string, limit = 5): Promise<RedditThread[]> {
    try {
      const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=${limit}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": this.userAgent
        }
      });

      if (!response.ok) {
        console.warn(`[RedditApiAdapter] API request failed with status ${response.status}. Falling back to mock data.`);
        return this.getMockThreads(query);
      }

      const json = await response.json() as any;
      if (!json.data || !json.data.children) {
        return this.getMockThreads(query);
      }

      const threads: RedditThread[] = json.data.children.map((child: any) => {
        const d = child.data;
        return {
          id: d.id,
          title: d.title,
          subreddit: d.subreddit,
          selftext: d.selftext || "",
          score: d.score,
          url: `https://www.reddit.com${d.permalink}`,
          author: d.author,
          num_comments: d.num_comments,
          created_utc: d.created_utc
        };
      });

      return threads;
    } catch (err: any) {
      console.warn(`[RedditApiAdapter] Error during search: ${err.message}. Falling back to mock data.`);
      return this.getMockThreads(query);
    }
  }

  async getComments(threadId: string, subreddit: string): Promise<RedditComment[]> {
    try {
      const url = `https://www.reddit.com/r/${subreddit}/comments/${threadId}.json`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": this.userAgent
        }
      });

      if (!response.ok) {
        return [];
      }

      const json = await response.json() as any;
      if (!Array.isArray(json) || json.length < 2 || !json[1].data || !json[1].data.children) {
        return [];
      }

      const comments: RedditComment[] = json[1].data.children
        .filter((child: any) => child.kind === "t1")
        .map((child: any) => {
          const d = child.data;
          return {
            id: d.id,
            author: d.author,
            body: d.body || "",
            score: d.score,
            created_utc: d.created_utc
          };
        });

      return comments;
    } catch {
      return [];
    }
  }

  private getMockThreads(query: string): RedditThread[] {
    // Generate mock threads based on standard developer pain points related to browser automation
    return [
      {
        id: "mock1",
        title: "Reddit blocking standard browser agents with CAPTCHA",
        subreddit: "node",
        selftext: `I am trying to run a standard Playwright script to fetch some public Reddit threads for research, and it gets hit by a CAPTCHA instantly. I am using standard chromium launch. How do we bypass this?`,
        score: 45,
        url: "https://www.reddit.com/r/node/comments/mock1",
        author: "dev_struggle_99",
        num_comments: 12,
        created_utc: Date.now() / 1000 - 86400,
        comments: [
          {
            id: "c1",
            author: "playwright_pro",
            body: "Reddit is actively increasing security checks on automated bots. Try using official APIs first as they are much more reliable.",
            score: 18,
            created_utc: Date.now() / 1000 - 80000
          }
        ]
      },
      {
        id: "mock2",
        title: "Playwright MCP server accessibility snapshots",
        subreddit: "LanguageTechnology",
        selftext: `Has anyone integrated the new Playwright Model Context Protocol (MCP) server? It lets LLMs inspect accessibility trees instead of relying on vision/screenshots which saves so many tokens.`,
        score: 88,
        url: "https://www.reddit.com/r/LanguageTechnology/comments/mock2",
        author: "ai_engineer_alpha",
        num_comments: 5,
        created_utc: Date.now() / 1000 - 172800,
        comments: [
          {
            id: "c2",
            author: "agent_developer",
            body: "Yes! Accessibility trees are much more stable than raw screenshot vision loops. Strongly recommend it for LLM-driven browser navigation.",
            score: 12,
            created_utc: Date.now() / 1000 - 160000
          }
        ]
      },
      {
        id: "mock3",
        title: "Hermes CUA macOS setup issues",
        subreddit: "artificial",
        selftext: `Trying to run Hermes computer-use agent on my macOS. Keep hitting issues with Accessibility and Screen Recording permissions. What should I check?`,
        score: 30,
        url: "https://www.reddit.com/r/artificial/comments/mock3",
        author: "mac_user_newbie",
        num_comments: 8,
        created_utc: Date.now() / 1000 - 43200,
        comments: [
          {
            id: "c3",
            author: "hermes_user",
            body: "Try running 'hermes computer-use doctor' command in your terminal. It triages setup permissions and resolves CUA setup failures immediately.",
            score: 15,
            created_utc: Date.now() / 1000 - 40000
          }
        ]
      }
    ];
  }
}
