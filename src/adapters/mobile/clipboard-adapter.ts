import { TermuxApiAdapter } from "./termux-api-adapter.js";
import { execSync } from "child_process";

export class ClipboardAdapter {
  /**
   * Sets the system clipboard content.
   */
  static set(text: string): boolean {
    if (TermuxApiAdapter.isCommandAvailable("termux-clipboard-set")) {
      const res = TermuxApiAdapter.runCommand("termux-clipboard-set", [text]);
      return res.success;
    }

    // Fallback for macOS development
    if (process.platform === "darwin" && TermuxApiAdapter.isCommandAvailable("pbcopy")) {
      try {
        const process = require("child_process").spawn("pbcopy");
        process.stdin.write(text);
        process.stdin.end();
        return true;
      } catch {
        return false;
      }
    }

    // Fallback for Linux development
    if (process.platform === "linux") {
      if (TermuxApiAdapter.isCommandAvailable("xclip")) {
        try {
          const process = require("child_process").spawn("xclip", ["-selection", "clipboard"]);
          process.stdin.write(text);
          process.stdin.end();
          return true;
        } catch {
          // ignore
        }
      }
      if (TermuxApiAdapter.isCommandAvailable("xsel")) {
        try {
          const process = require("child_process").spawn("xsel", ["-b", "-i"]);
          process.stdin.write(text);
          process.stdin.end();
          return true;
        } catch {
          // ignore
        }
      }
    }

    // Mock/No-op fallback if no CLI tools are found
    console.warn("[ClipboardAdapter] Clipboard tool not found. Text would be copied to clipboard in Termux.");
    return false;
  }

  /**
   * Gets the system clipboard content.
   */
  static get(): string {
    if (TermuxApiAdapter.isCommandAvailable("termux-clipboard-get")) {
      const res = TermuxApiAdapter.runCommand("termux-clipboard-get");
      return res.success ? res.stdout : "";
    }

    // Fallback for macOS development
    if (process.platform === "darwin" && TermuxApiAdapter.isCommandAvailable("pbpaste")) {
      try {
        return execSync("pbpaste", { encoding: "utf-8" }).trim();
      } catch {
        return "";
      }
    }

    // Fallback for Linux development
    if (process.platform === "linux") {
      if (TermuxApiAdapter.isCommandAvailable("xclip")) {
        try {
          return execSync("xclip -selection clipboard -o", { encoding: "utf-8" }).trim();
        } catch {
          // ignore
        }
      }
      if (TermuxApiAdapter.isCommandAvailable("xsel")) {
        try {
          return execSync("xsel -b -o", { encoding: "utf-8" }).trim();
        } catch {
          // ignore
        }
      }
    }

    return "";
  }
}
