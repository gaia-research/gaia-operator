import { PlaywrightAdapter } from "../browser/playwright-adapter.js";
import { RedditThread, RedditComment } from "./reddit-types.js";
import { BlockDetector } from "../../core/block-detector.js";
import { BlockedSessionError } from "../../core/errors.js";

export class RedditBrowserAdapter {
  private browserAdapter: PlaywrightAdapter;
  private taskId: string;

  constructor(browserAdapter: PlaywrightAdapter, taskId: string) {
    this.browserAdapter = browserAdapter;
    this.taskId = taskId;
  }

  async searchThreads(query: string, screenshotDir?: string): Promise<RedditThread[]> {
    const url = `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`;
    const result = await this.browserAdapter.navigate(url, screenshotDir);

    const block = BlockDetector.detectBlock(this.taskId, "reddit", result.content, url);
    if (block) {
      throw new BlockedSessionError(
        `Reddit browser adapter blocked during search. Block type: ${block.block_type}.`,
        block.block_type,
        url,
        result.screenshotPath
      );
    }

    return this.parseSearchPage(result.content);
  }

  async getThreadComments(threadUrl: string, screenshotDir?: string): Promise<RedditComment[]> {
    const result = await this.browserAdapter.navigate(threadUrl, screenshotDir);

    const block = BlockDetector.detectBlock(this.taskId, "reddit", result.content, threadUrl);
    if (block) {
      throw new BlockedSessionError(
        `Reddit browser adapter blocked while fetching thread comments. Block type: ${block.block_type}.`,
        block.block_type,
        threadUrl,
        result.screenshotPath
      );
    }

    return this.parseCommentsPage(result.content);
  }

  private parseSearchPage(html: string): RedditThread[] {
    const threads: RedditThread[] = [];
    const threadBlockRegex = /class="thread" url="([^"]+)"[\s\S]*?class="title">([^<]+)<\/a>[\s\S]*?class="body">([^<]+)<\/p>/g;
    let match;
    let index = 1;

    while ((match = threadBlockRegex.exec(html)) !== null) {
      const url = this.normalizeUrl(match[1]);
      const title = this.decodeHtml(match[2].trim());
      const body = this.decodeHtml(match[3].trim());
      const subMatch = url.match(/\/r\/([^/]+)/);
      const subreddit = subMatch ? subMatch[1] : "unknown";

      threads.push({
        id: `browser_${index++}`,
        title,
        subreddit,
        selftext: body,
        score: 0,
        url,
        author: "unknown",
        num_comments: 0,
        created_utc: 0
      });
    }

    return threads;
  }

  private parseCommentsPage(_html: string): RedditComment[] {
    return [];
  }

  private normalizeUrl(url: string): string {
    if (url.startsWith("https://")) return url;
    if (url.startsWith("/")) return `https://www.reddit.com${url}`;
    return url;
  }

  private decodeHtml(value: string): string {
    return value
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
}
