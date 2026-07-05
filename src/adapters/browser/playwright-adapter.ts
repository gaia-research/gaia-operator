import * as fs from "fs";
import * as path from "path";

export class PlaywrightAdapter {
  private browser: any = null;
  private context: any = null;
  private isMock = false;

  async init(headless = true): Promise<boolean> {
    try {
      const playwright = await import("playwright");
      this.browser = await playwright.chromium.launch({ 
        headless,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });
      this.context = await this.browser.newContext({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      });
      this.isMock = false;
      return true;
    } catch (err: any) {
      console.warn(`[PlaywrightAdapter] Launch failed: ${err.message}. Falling back to simulated browser mode.`);
      this.isMock = true;
      return false;
    }
  }

  isMocked(): boolean {
    return this.isMock;
  }

  async navigate(
    url: string,
    screenshotDir?: string
  ): Promise<{ content: string; title: string; screenshotPath?: string }> {
    if (this.isMock) {
      // Return simulated markup
      const mockTitle = `Simulated Page - ${new URL(url).hostname}`;
      const mockContent = `
        <html>
          <head><title>${mockTitle}</title></head>
          <body>
            <div id="mock-container">
              <h1>Search Results for Community</h1>
              <p>Found discussion threads about browser automation, CUA, and Playwright MCP agents.</p>
              <div class="thread" url="https://www.reddit.com/r/node/comments/123">
                <a href="/r/node/comments/123" class="title">Struggling with browser agents blocking on Reddit</a>
                <p class="body">I am trying to run standard Playwright script to fetch Reddit posts and it gets blocked by CAPTCHA instantly. Any tips?</p>
              </div>
              <div class="thread" url="https://www.reddit.com/r/LanguageTechnology/comments/456">
                <a href="/r/LanguageTechnology/comments/456" class="title">Playwright MCP server for browser control</a>
                <p class="body">Has anyone tried the new Playwright Model Context Protocol server? It exposes accessibility trees which is so much better than sending raw screenshots to LLMs.</p>
              </div>
              <div class="thread" url="https://www.reddit.com/r/artificial/comments/789">
                <a href="/r/artificial/comments/789" class="title">Computer Use Agent Setup</a>
                <p class="body">Setting up Hermes CUA on my Macbook. I keep running into screen recording permission prompt failures. Has anyone run the hermes computer-use doctor command to troubleshoot?</p>
              </div>
            </div>
          </body>
        </html>
      `;
      return { content: mockContent, title: mockTitle };
    }

    if (!this.context) {
      throw new Error("PlaywrightAdapter is not initialized. Call init() first.");
    }

    const page = await this.context.newPage();
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      const content = await page.content();
      const title = await page.title();

      let screenshotPath: string | undefined;
      if (screenshotDir) {
        if (!fs.existsSync(screenshotDir)) {
          fs.mkdirSync(screenshotDir, { recursive: true });
        }
        const filename = `screenshot_${Date.now()}.png`;
        screenshotPath = path.join(screenshotDir, filename);
        await page.screenshot({ path: screenshotPath });
      }

      return { content, title, screenshotPath };
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
    }
  }
}
