import * as fs from "fs";
import * as path from "path";
import type { Page } from "playwright";

export class ScreenshotHelper {
  static async capturePage(page: Page, outputDir: string, name: string): Promise<string> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, `${name}_${Date.now()}.png`);
    await page.screenshot({ path: outputPath, fullPage: true });
    return outputPath;
  }
}
