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

      const userAgent = process.env.GAIA_OPERATOR_BROWSER_USER_AGENT;
      this.context = await this.browser.newContext({
        ...(userAgent ? { userAgent } : {})
      });

      this.isMock = false;
      return true;
    } catch (err: any) {
      if (!this.isSimulationAllowed()) {
        throw new Error(
          `Playwright launch failed and simulation is disabled. Run 'pnpm operator doctor' or set GAIA_OPERATOR_ALLOW_SIMULATION=true only for local dry-runs/tests. Cause: ${err.message}`
        );
      }

      console.warn(`[PlaywrightAdapter] Launch failed: ${err.message}. Using explicit simulated browser mode.`);
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
      return this.simulatedNavigate(url);
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
        await page.screenshot({ path: screenshotPath, fullPage: true });
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

  private isSimulationAllowed(): boolean {
    return process.env.GAIA_OPERATOR_ALLOW_SIMULATION === "true" || process.env.NODE_ENV === "test";
  }

  private simulatedNavigate(url: string): { content: string; title: string } {
    const mockTitle = `Simulated Page - ${new URL(url).hostname}`;
    const mockContent = `
      <html>
        <head><title>${mockTitle}</title></head>
        <body data-gaia-simulation="true">
          <p>Simulated browser content. Do not treat this as live platform evidence.</p>
          <div class="thread" url="https://www.reddit.com/r/node/comments/123">
            <a href="/r/node/comments/123" class="title">Struggling with browser agents blocking on Reddit</a>
            <p class="body">I am trying to run a standard Playwright script to fetch Reddit posts and it gets blocked by CAPTCHA instantly. Any tips?</p>
          </div>
          <div class="thread" url="https://www.reddit.com/r/LanguageTechnology/comments/456">
            <a href="/r/LanguageTechnology/comments/456" class="title">Playwright MCP server for browser control</a>
            <p class="body">Has anyone tried the Playwright Model Context Protocol server? It exposes accessibility trees, which looks more stable than sending raw screenshots to LLMs.</p>
          </div>
          <div class="thread" url="https://www.reddit.com/r/artificial/comments/789">
            <a href="/r/artificial/comments/789" class="title">Computer Use Agent Setup</a>
            <p class="body">Setting up Hermes CUA on my MacBook. I keep running into screen recording permission prompt failures.</p>
          </div>
        </body>
      </html>
    `;
    return { content: mockContent, title: mockTitle };
  }
}
