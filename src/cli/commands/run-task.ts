import { Orchestrator } from "../../core/orchestrator.js";

export async function runTaskCommand(taskFile: string): Promise<void> {
  console.log(`Starting task execution for: ${taskFile}`);
  
  try {
    const orchestrator = new Orchestrator();
    const result = await orchestrator.runTask(taskFile);
    
    console.log("\n=== Task Execution Summary ===");
    console.log(`Task ID: ${result.task_id}`);
    console.log(`Status: ${result.status.toUpperCase()}`);
    console.log(`Risk Ceiling: ${result.risk_ceiling_used}`);
    console.log(`Public Actions Taken: ${result.public_actions_taken}`);
    console.log(`Approval Required: ${result.approval_required ? "YES" : "NO"}`);
    console.log(`Blocked: ${result.blocked ? "YES" : "NO"}`);
    console.log(`Next Recommendation: ${result.recommended_next_action}`);
    
    console.log("\nExported Artifacts:");
    for (const [key, val] of Object.entries(result.artifacts)) {
      if (val) {
        console.log(`- ${key}: ${val}`);
      }
    }
  } catch (err: any) {
    console.error(`\n❌ Orchestrator failed to run task: ${err.message}`);
    process.exit(1);
  }
}
