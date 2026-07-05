import * as fs from "fs";
import * as path from "path";
import { Trace } from "../../core/types.js";

export async function replayTraceCommand(traceFile: string): Promise<void> {
  const filePath = path.resolve(process.cwd(), traceFile);
  if (!fs.existsSync(filePath)) {
    console.error(`Trace file not found: ${filePath}`);
    process.exit(1);
  }

  try {
    const trace = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Trace;
    console.log(`=== Replaying Trace: ${trace.task_id} ===`);
    console.log(`Original Status: ${trace.status}`);
    console.log(`Risk Ceiling: ${trace.risk_ceiling_used}`);
    console.log(`Created At: ${trace.created_at}`);
    console.log(`Steps Recorded: ${trace.steps.length}\n`);

    for (const step of trace.steps) {
      console.log(`[${step.timestamp}] Step: ${step.step_id} - ${step.action}`);
      if (step.platform) {
        console.log(`  Platform: ${step.platform}`);
      }
      console.log(`  Risk Level: ${step.risk_level}`);
      console.log(`  Input: ${JSON.stringify(step.input)}`);
      console.log(`  Output: ${JSON.stringify(step.output)}`);
      console.log("");
      // Add slight delay for readability during CLI run
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log("=== Replay Finished ===");
  } catch (err: any) {
    console.error(`Failed to replay trace: ${err.message}`);
    process.exit(1);
  }
}
