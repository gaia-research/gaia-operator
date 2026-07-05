import { TermuxApiAdapter } from "./termux-api-adapter.js";
import { AndroidIntentAdapter } from "./android-intent-adapter.js";
import { spawn } from "child_process";

export class ShareAdapter {
  /**
   * Shares text using termux-share or Android intent fallback.
   */
  static shareText(text: string, title?: string): boolean {
    if (TermuxApiAdapter.isCommandAvailable("termux-share")) {
      try {
        const args: string[] = [];
        if (title) {
          args.push("-t", title);
        }
        
        const child = spawn("termux-share", args);
        child.stdin.write(text);
        child.stdin.end();
        return true;
      } catch (err) {
        console.error("[ShareAdapter] termux-share failed, trying intent fallback:", err);
      }
    }

    // Fallback to Android Intent SEND
    if (AndroidIntentAdapter.isAmAvailable()) {
      return AndroidIntentAdapter.shareText(text);
    }

    console.log(`[ShareAdapter Mock] Share trigger (no-op): ${text.substring(0, 50)}...`);
    return true;
  }
}
