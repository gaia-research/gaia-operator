import { ClipboardAdapter } from "./clipboard-adapter.js";
import { NotificationAdapter } from "./notification-adapter.js";
import { AndroidIntentAdapter } from "./android-intent-adapter.js";
import { ShareAdapter } from "./share-adapter.js";
import { TermuxApiAdapter } from "./termux-api-adapter.js";

export interface HandoffOptions {
  draftText: string;
  targetUrl?: string;
  notificationTitle?: string;
  notificationContent?: string;
  taskId: string;
  sharePayload?: boolean;
}

export interface HandoffResult {
  clipboardWritten: boolean;
  urlOpened: boolean;
  notificationSent: boolean;
  shareSent?: boolean;
}

export class MobileHandoffAdapter {
  /**
   * Executes the full handoff flow: clipboard, notification, URL open, and optional share.
   */
  static execute(options: HandoffOptions): HandoffResult {
    // 1. Copy only the draft text to clipboard
    const clipboardWritten = ClipboardAdapter.set(options.draftText);

    // 2. Open target URL
    let urlOpened = false;
    if (options.targetUrl) {
      if (TermuxApiAdapter.isCommandAvailable("termux-open-url")) {
        const res = TermuxApiAdapter.runCommand("termux-open-url", [options.targetUrl]);
        urlOpened = res.success;
      }
      
      if (!urlOpened && AndroidIntentAdapter.isAmAvailable()) {
        urlOpened = AndroidIntentAdapter.openUrl(options.targetUrl);
      }

      // Local dev system-open fallback (macOS/Linux)
      if (!urlOpened) {
        if (process.platform === "darwin" && TermuxApiAdapter.isCommandAvailable("open")) {
          const res = TermuxApiAdapter.runCommand("open", [options.targetUrl]);
          urlOpened = res.success;
        } else if (process.platform === "linux" && TermuxApiAdapter.isCommandAvailable("xdg-open")) {
          const res = TermuxApiAdapter.runCommand("xdg-open", [options.targetUrl]);
          urlOpened = res.success;
        }
      }
    }

    // 3. Send Android/system notification
    const notificationSent = NotificationAdapter.send({
      title: options.notificationTitle || "Gaia Handoff Ready",
      content: options.notificationContent || "Draft copied. Review before posting.",
      id: options.taskId
    });

    // 4. Optional share payload
    let shareSent = false;
    if (options.sharePayload) {
      shareSent = ShareAdapter.shareText(options.draftText, options.notificationTitle);
    }

    return {
      clipboardWritten,
      urlOpened,
      notificationSent,
      shareSent
    };
  }
}
