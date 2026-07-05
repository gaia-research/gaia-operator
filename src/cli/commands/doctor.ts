import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import { CuaDoctor } from "../../adapters/computer-use/cua-doctor.js";

dotenv.config();

export async function doctorCommand(): Promise<void> {
  console.log("=== Gaia Operator Doctor ===");
  
  // 1. Node.js Version Check
  console.log(`Node.js Version: ${process.version}`);

  // 2. Playwright Check
  let playwrightInstalled = false;
  try {
    require.resolve("playwright");
    playwrightInstalled = true;
    console.log("Playwright NPM Package: Installed");
  } catch {
    console.log("Playwright NPM Package: Not Found");
  }

  // 3. Hermes availability
  let hermesAvailable = false;
  try {
    execSync("which hermes", { stdio: "ignore" });
    hermesAvailable = true;
    console.log("Hermes CLI: Available in PATH");
  } catch {
    console.log("Hermes CLI: Not Found in PATH");
  }

  // 4. Run CUA Diagnostics
  if (hermesAvailable) {
    console.log("Running CUA Diagnostics via Hermes...");
    const res = CuaDoctor.runDiagnostics();
    console.log(`Diagnostics Result: ${res.message}`);
    if (res.details) {
      console.log(`Details:\n${res.details}`);
    }
  } else {
    console.log("CUA Diagnostics: Skipped (Hermes CLI not available)");
  }

  // 5. Environment Config
  console.log("\n--- Config Environment ---");
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    console.log(".env File: Found");
    console.log(`GAIA_OPERATOR_HOME: ${process.env.GAIA_OPERATOR_HOME || ".gaia-operator (default)"}`);
    console.log(`MARKETING_TASKS_PATH: ${process.env.MARKETING_TASKS_PATH || "../marketing-tasks (default)"}`);
    console.log(`DEFAULT_DRIVER: ${process.env.DEFAULT_DRIVER || "hermes"}`);
    console.log(`ENABLE_PUBLIC_WRITE: ${process.env.ENABLE_PUBLIC_WRITE || "false"}`);
  } else {
    console.log(".env File: Not Found (using defaults)");
  }

  console.log("\nDoctor run complete.");
}
