import * as fs from "fs";
import * as path from "path";
import { QueueEntryAdapter, QueueEntryLoadError } from "../../adapters/filesystem/queue-entry-adapter.js";
import { TaskLoader } from "../../core/task-loader.js";
import { TaskValidationError } from "../../core/errors.js";
import { Orchestrator } from "../../core/orchestrator.js";
import { StateStore } from "../../core/state-store.js";

function resolveQueueFile(queueFile: string): string {
  return path.resolve(process.cwd(), queueFile);
}

export function validateQueueEntryCommand(queueFile: string): void {
  const queuePath = resolveQueueFile(queueFile);
  console.log(`Validating queue entry: ${queuePath}`);

  try {
    if (!fs.existsSync(queuePath)) {
      throw new QueueEntryLoadError(`Queue entry not found: ${queuePath}`);
    }

    const task = QueueEntryAdapter.parseFile(queuePath);
    const staticValidate = TaskLoader.validate;
    staticValidate(task);

    console.log("\n✅ Derived task schema is valid!");
    console.log("------------------------");
    console.log(`Queue file: ${queuePath}`);
    console.log(`ID: ${task.id}`);
    console.log(`Title: ${task.title}`);
    console.log(`Platforms: ${task.platforms.join(", ")}`);
    console.log(`Mode: ${task.mode}`);
    console.log(`Risk Ceiling: ${task.risk_ceiling}`);
    console.log(`Derived outputs: ${task.outputs.join(", ")}`);
    console.log(`Objective: ${task.objective}`);
  } catch (err: any) {
    console.error("\n❌ Queue entry validation failed!");
    console.error("------------------------");
    if (err instanceof QueueEntryLoadError) {
      console.error(err.message);
    } else if (err instanceof TaskValidationError) {
      console.error(err.message);
      if (err.errors) {
        console.error("\nDetailed Errors:");
        console.error(JSON.stringify(err.errors, null, 2));
      }
    } else {
      console.error(err.message);
    }
    process.exit(1);
  }
}

export async function runQueueEntryCommand(queueFile: string): Promise<void> {
  const queuePath = resolveQueueFile(queueFile);
  console.log(`Running queue entry: ${queuePath}`);

  try {
    if (!fs.existsSync(queuePath)) {
      throw new QueueEntryLoadError(`Queue entry not found: ${queuePath}`);
    }

    const task = QueueEntryAdapter.parseFile(queuePath);
    const staticValidate = TaskLoader.validate;
    staticValidate(task);

    const store = new StateStore();
    const artifactsDir = store.getArtifactsDir(task.id);
    const taskPath = path.join(artifactsDir, `${task.id}.derived.json`);
    fs.writeFileSync(taskPath, JSON.stringify(task, null, 2), "utf-8");
    console.log(`\nDerived task written to: ${taskPath}`);

    const orchestrator = new Orchestrator();
    const result = await orchestrator.runTask(taskPath);

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
    console.error(`\n❌ Queue task execution failed: ${err.message}`);
    process.exit(1);
  }
}

export function exportDerivedTaskCommand(queueFile: string, destination?: string): void {
  const queuePath = resolveQueueFile(queueFile);

  try {
    if (!fs.existsSync(queuePath)) {
      throw new QueueEntryLoadError(`Queue entry not found: ${queuePath}`);
    }

    const task = QueueEntryAdapter.parseFile(queuePath);
    const store = new StateStore();
    const artifactsDir = store.getArtifactsDir(task.id);
    const taskPath = path.join(artifactsDir, `${task.id}.derived.json`);
    fs.writeFileSync(taskPath, JSON.stringify(task, null, 2), "utf-8");

    const target = destination
      ? path.resolve(process.cwd(), destination)
      : path.resolve(process.cwd(), `${task.id}.derived.json`);

    fs.copyFileSync(taskPath, target);
    console.log(`Derived task exported to: ${target}`);
  } catch (err: any) {
    console.error(`Failed to export derived task: ${err.message}`);
    process.exit(1);
  }
}
