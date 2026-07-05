import { describe, it, expect } from "vitest";
import * as path from "path";
import { TaskLoader } from "../../src/core/task-loader.js";

describe("Task Loader", () => {
  it("should validate and load a valid task JSON", () => {
    const filePath = path.resolve(__dirname, "../fixtures/reddit-task.json");
    const task = TaskLoader.loadFromFile(filePath);
    
    expect(task.id).toBe("test-task-id");
    expect(task.platforms).toContain("reddit");
    expect(task.risk_ceiling).toBe("L3");
    expect(task.mode).toBe("research_and_draft");
  });

  it("should throw error on invalid tasks", () => {
    expect(() => {
      TaskLoader.validate({
        id: "invalid-task",
        // missing required fields
      });
    }).toThrow();
  });
});
