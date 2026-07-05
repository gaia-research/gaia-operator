import { TermuxApiAdapter } from "./termux-api-adapter.js";

export interface NotificationOptions {
  title: string;
  content: string;
  id?: string;
  group?: string;
  ledColor?: string; // hex
  priority?: "high" | "low" | "max" | "min" | "default";
}

export class NotificationAdapter {
  /**
   * Triggers a system notification.
   */
  static send(options: NotificationOptions): boolean {
    const { title, content, id, group, ledColor, priority } = options;

    if (TermuxApiAdapter.isCommandAvailable("termux-notification")) {
      const args: string[] = [];
      args.push("--title", title);
      args.push("--content", content);
      
      if (id) {
        args.push("--id", id);
      }
      if (group) {
        args.push("--group", group);
      }
      if (ledColor) {
        args.push("--led-color", ledColor);
      }
      if (priority) {
        args.push("--priority", priority);
      }

      const res = TermuxApiAdapter.runCommand("termux-notification", args);
      return res.success;
    }

    // Fallback for macOS development
    if (process.platform === "darwin" && TermuxApiAdapter.isCommandAvailable("osascript")) {
      try {
        const escapedContent = content.replace(/"/g, '\\"');
        const escapedTitle = title.replace(/"/g, '\\"');
        TermuxApiAdapter.runCommand("osascript", [
          "-e",
          `display notification "${escapedContent}" with title "${escapedTitle}"`
        ]);
        return true;
      } catch {
        return false;
      }
    }

    // Fallback for Linux development
    if (process.platform === "linux" && TermuxApiAdapter.isCommandAvailable("notify-send")) {
      try {
        TermuxApiAdapter.runCommand("notify-send", [title, content]);
        return true;
      } catch {
        return false;
      }
    }

    console.log(`[NotificationAdapter Mock] Notification: "${title}" - ${content}`);
    return true;
  }
}
