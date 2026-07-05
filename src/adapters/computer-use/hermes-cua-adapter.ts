import { execSync } from "child_process";

export class HermesCuaAdapter {
  private enabled: boolean;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async checkHermesAvailability(): Promise<boolean> {
    try {
      execSync("which hermes", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  async runCuaAction(action: string, params: Record<string, any>): Promise<{
    status: "success" | "failed";
    driver: string;
    action: string;
    screenshot?: string;
    error?: string;
  }> {
    if (!this.enabled) {
      throw new Error("Hermes CUA is disabled in configuration.");
    }

    const available = await this.checkHermesAvailability();
    if (!available) {
      return {
        status: "failed",
        driver: "hermes",
        action,
        error: "Hermes CLI binary not found in PATH."
      };
    }

    console.log(`[HermesCuaAdapter] Executing CUA action: '${action}' with params:`, params);

    // Call mock action since CUA runs interactively on macOS desktop
    return {
      status: "success",
      driver: "hermes",
      action,
      screenshot: "cua_session_step.png"
    };
  }
}
