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
    status: "success" | "failed" | "gated";
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
        error: "Hermes CLI binary not found in PATH. Run pnpm operator doctor and hermes computer-use doctor on the MacBook."
      };
    }

    console.log(`[HermesCuaAdapter] CUA action requested: '${action}' with params:`, params);

    return {
      status: "gated",
      driver: "hermes",
      action,
      error: "Hermes CUA direct execution is intentionally gated in the MVP adapter. Use it only through an explicit human-reviewed runbook, never as silent fallback."
    };
  }
}
