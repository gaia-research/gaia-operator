import { execSync } from "child_process";

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: Error;
}

export class TermuxApiAdapter {
  /**
   * Executes a shell command synchronously and returns the output/errors.
   */
  static runCommand(command: string, args: string[] = []): ExecutionResult {
    const fullCmd = args.length > 0 
      ? `${command} ${args.map(arg => this.escapeArg(arg)).join(" ")}` 
      : command;

    try {
      const stdout = execSync(fullCmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
      return {
        success: true,
        stdout: stdout.trim(),
        stderr: ""
      };
    } catch (error: any) {
      return {
        success: false,
        stdout: (error.stdout || "").toString().trim(),
        stderr: (error.stderr || "").toString().trim(),
        error: error as Error
      };
    }
  }

  /**
   * Checks if a command is available on the system path.
   */
  static isCommandAvailable(command: string): boolean {
    try {
      execSync(`which ${command}`, { stdio: "ignore" });
      return true;
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

  /**
   * Helper to escape arguments for shell execution.
   */
  private static escapeArg(arg: string): string {
    // Wrap in single quotes, escaping existing single quotes
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }
}
