import { TermuxApiAdapter } from "./termux-api-adapter.js";

export class AndroidIntentAdapter {
  /**
   * Checks if the Android Activity Manager CLI ('am') is available.
   */
  static isAmAvailable(): boolean {
    return TermuxApiAdapter.isCommandAvailable("am");
  }

  /**
   * Opens a URL using the Android intent system.
   */
  static openUrl(url: string): boolean {
    if (!this.isAmAvailable()) {
      return false;
    }
    
    // am start -a android.intent.action.VIEW -d "$TARGET_URL"
    const res = TermuxApiAdapter.runCommand("am", [
      "start",
      "-a", "android.intent.action.VIEW",
      "-d", url
    ]);
    
    return res.success;
  }

  /**
   * Shares plain text via the Android share sheet.
   */
  static shareText(text: string): boolean {
    if (!this.isAmAvailable()) {
      return false;
    }
    
    // am start -a android.intent.action.SEND -t "text/plain" --es android.intent.extra.TEXT "$DRAFT"
    const res = TermuxApiAdapter.runCommand("am", [
      "start",
      "-a", "android.intent.action.SEND",
      "-t", "text/plain",
      "--es", "android.intent.extra.TEXT",
      text
    ]);
    
    return res.success;
  }
}
