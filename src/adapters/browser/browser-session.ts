import * as fs from "fs";
import type { BrowserContext } from "playwright";

export class BrowserSessionManager {
  static async saveState(context: BrowserContext, filePath: string): Promise<void> {
    try {
      await context.storageState({ path: filePath });
    } catch (err: any) {
      console.error(`Failed to save browser session state: ${err.message}`);
    }
  }

  static async loadState(context: BrowserContext, filePath: string): Promise<boolean> {
    if (fs.existsSync(filePath)) {
      try {
        // Playwright handles loading context state during creation, 
        // so this is a placeholder/helper for verification.
        return true;
      } catch (err: any) {
        console.error(`Failed to verify browser session state: ${err.message}`);
      }
    }
    return false;
  }
}
