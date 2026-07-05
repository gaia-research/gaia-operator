import * as path from "path";
import { TaskLoader } from "../../core/task-loader.js";
import { TaskValidationError } from "../../core/errors.js";

export async function validateTaskCommand(taskFile: string): Promise<void> {
  const absolutePath = path.resolve(process.cwd(), taskFile);
  console.log(`Validating task file: ${absolutePath}`);

  try {
    const task = TaskLoader.loadFromFile(absolutePath);
    console.log("\n✅ Task schema is valid!");
    console.log("------------------------");
    console.log(`ID: ${task.id}`);
    console.log(`Title: ${task.title}`);
    console.log(`Platforms: ${task.platforms.join(", ")}`);
    console.log(`Mode: ${task.mode}`);
    console.log(`Risk Ceiling: ${task.risk_ceiling}`);
    console.log(`Objective: ${task.objective}`);
  } catch (err: any) {
    console.error("\n❌ Task validation failed!");
    console.error("------------------------");
    if (err instanceof TaskValidationError) {
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
