import { spawnSync } from "child_process";

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: Error;
}

export class TermuxApiAdapter {
  /**
   * Executes a command using spawnSync to avoid shell injection / escaping vulnerabilities.
   */
  static runCommand(command: string, args: string[] = []): ExecutionResult {
    try {
      const result = spawnSync(command, args, { 
        encoding: "utf-8", 
        stdio: ["pipe", "pipe", "pipe"] 
      });
      
      return {
        success: result.status === 0,
        stdout: (result.stdout || "").toString().trim(),
        stderr: (result.stderr || "").toString().trim(),
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        stdout: "",
        stderr: error.message || "",
        error
      };
    }
  }

  /**
   * Checks if a command is available on the system path using spawnSync.
   */
  static isCommandAvailable(command: string): boolean {
    try {
      // Use 'which' or 'command -v' (via shell only if command is built-in, but 'which' is standard on Unix/Android)
      const result = spawnSync("which", [command], { stdio: "ignore" });
      return result.status === 0;
    } catch {
      return false;
    }
  }

  /**
   * Checks if we are running in a Termux environment.
   */
  static isTermux(): boolean {
    return process.env.TERMUX_VERSION !== undefined || this.isCommandAvailable("termux-info");
  }

  /**
   * Gets device info from termux-info.
   */
  static getDeviceInfo(): Record<string, any> {
    if (!this.isCommandAvailable("termux-info")) {
      return { is_termux: false, system: process.platform };
    }
    const res = this.runCommand("termux-info");
    if (!res.success) {
      return { is_termux: true, error: res.stderr || "Failed to execute termux-info" };
    }
    try {
      return JSON.parse(res.stdout);
    } catch {
      return { is_termux: true, raw_info: res.stdout };
    }
  }
}
