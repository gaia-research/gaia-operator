import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import { OperatorTask, ResultSummary } from "../../core/types.js";
import { TaskLoader } from "../../core/task-loader.js";

dotenv.config();

export class MarketingTasksAdapter {
  private baseDir: string;

  constructor() {
    const tasksPath = process.env.MARKETING_TASKS_PATH || "../marketing-tasks";
    this.baseDir = path.resolve(process.cwd(), tasksPath);
  }

  getMarketingTasksDir(): string {
    return this.baseDir;
  }

  isConfigured(): boolean {
    return fs.existsSync(this.baseDir);
  }

  loadTask(taskFileName: string): OperatorTask {
    // Look first directly, then in tasks/ subdirectory
    let taskPath = path.resolve(process.cwd(), taskFileName);
    
    if (!fs.existsSync(taskPath) && this.isConfigured()) {
      taskPath = path.join(this.baseDir, taskFileName);
      if (!fs.existsSync(taskPath)) {
        taskPath = path.join(this.baseDir, "tasks", taskFileName);
      }
    }

    if (!fs.existsSync(taskPath)) {
      throw new Error(`Task file '${taskFileName}' not found locally or in marketing-tasks path: ${this.baseDir}`);
    }

    return TaskLoader.loadFromFile(taskPath);
  }

  syncResult(taskId: string, result: ResultSummary): string {
    if (!this.isConfigured()) {
      console.warn(`[MarketingTasksAdapter] marketing-tasks path '${this.baseDir}' does not exist. Results will not be synced.`);
      return "";
    }

    const syncDir = path.join(this.baseDir, "queue", "completed");
    if (!fs.existsSync(syncDir)) {
      fs.mkdirSync(syncDir, { recursive: true });
    }

    const syncPath = path.join(syncDir, `${taskId}_result.json`);
    fs.writeFileSync(syncPath, JSON.stringify(result, null, 2), "utf-8");
    console.log(`[MarketingTasksAdapter] Task status synced to marketing-tasks: ${syncPath}`);
    return syncPath;
  }
}
