import { describe, it, expect, beforeAll } from "vitest";
import * as path from "path";
import * as fs from "fs";
import { Orchestrator } from "../../src/core/orchestrator.js";

describe("Orchestrator Integration Run", () => {
  beforeAll(() => {
    process.env.GAIA_OPERATOR_HOME = ".gaia-operator-test";
    process.env.MARKETING_TASKS_PATH = ".";
  });

  it("should successfully execute task and create artifacts", async () => {
    const taskPath = path.resolve(__dirname, "../fixtures/reddit-task.json");
    const orchestrator = new Orchestrator();

    const result = await orchestrator.runTask(taskPath);

    expect(result.task_id).toBe("test-task-id");
    expect(result.status).toBe("completed");
    expect(result.blocked).toBe(false);
    expect(result.approval_required).toBe(true); // default requirements for L3/L2

    // Check files exist
    expect(result.artifacts.report).toBeDefined();
    expect(result.artifacts.trace).toBeDefined();
    
    if (result.artifacts.report) {
      expect(fs.existsSync(result.artifacts.report)).toBe(true);
      const content = fs.readFileSync(result.artifacts.report, "utf-8");
      expect(content).toContain("Report: Test Task");
      expect(content).toContain("Platforms Inspected");
    }

    if (result.artifacts.trace) {
      expect(fs.existsSync(result.artifacts.trace)).toBe(true);
      const traceData = JSON.parse(fs.readFileSync(result.artifacts.trace, "utf-8"));
      expect(traceData.task_id).toBe("test-task-id");
      expect(traceData.steps.length).toBeGreaterThan(0);
    }
  });
});
