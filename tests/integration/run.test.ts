import { describe, it, expect, beforeAll, vi } from "vitest";
import * as path from "path";
import * as fs from "fs";
import { Orchestrator } from "../../src/core/orchestrator.js";

describe("Orchestrator Integration Run", () => {
  beforeAll(() => {
    process.env.GAIA_OPERATOR_HOME = ".gaia-operator-test";
    process.env.MARKETING_TASKS_PATH = ".";
    process.env.GAIA_OPERATOR_ALLOW_SIMULATION = "true";

    // Mock global.fetch to guarantee reproducible test execution
    global.fetch = vi.fn().mockImplementation((url: string) => {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => {
          if (url.includes("/comments/")) {
            return Promise.resolve([
              { data: { children: [] } },
              {
                data: {
                  children: [
                    {
                      kind: "t1",
                      data: {
                        id: "c1",
                        author: "commenter_one",
                        body: "Ensure you use the standard API.",
                        score: 5,
                        created_utc: Date.now() / 1000
                      }
                    }
                  ]
                }
              }
            ]);
          }
          return Promise.resolve({
            data: {
              children: [
                {
                  kind: "t3",
                  data: {
                    id: "thread1",
                    title: "Struggling with browser agents and Playwright blocking",
                    subreddit: "node",
                    selftext: "How do you run Playwright without getting blocked by Reddit?",
                    score: 10,
                    permalink: "/r/node/comments/thread1",
                    author: "user_test",
                    num_comments: 3,
                    created_utc: Date.now() / 1000
                  }
                }
              ]
            }
          });
        }
      } as any);
    });
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
