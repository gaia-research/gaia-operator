import { execSync } from "child_process";

export interface DoctorResult {
  passed: boolean;
  message: string;
  details?: string;
}

export class CuaDoctor {
  static runDiagnostics(): DoctorResult {
    try {
      // Execute 'hermes computer-use doctor'
      const stdout = execSync("hermes computer-use doctor", { encoding: "utf-8", stdio: "pipe" });
      return {
        passed: true,
        message: "Hermes computer-use doctor passed successfully.",
        details: stdout
      };
    } catch (err: any) {
      return {
        passed: false,
        message: "Hermes computer-use doctor diagnostics failed or not available.",
        details: err.stderr || err.message
      };
    }
  }
}
