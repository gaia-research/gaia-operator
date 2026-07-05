import { describe, it, expect, afterEach } from "vitest";
import * as path from "path";
import * as fs from "fs";
import { QueueEntryAdapter, QueueEntryLoadError } from "../../src/adapters/filesystem/queue-entry-adapter.js";

describe("Queue Entry Adapter", () => {
  const fixtureDir = path.resolve(__dirname, "../fixtures");

  afterEach(() => {
    const files = [
      path.join(fixtureDir, "nova-reddit-explorer-queue-entry.md"),
      path.join(fixtureDir, "queue-entry-reddit-defaults.md")
    ];
    for (const filePath of files) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  });

  it("should load and parse a minimal reddit queue entry", () => {
    const filePath = path.join(fixtureDir, "nova-reddit-explorer-queue-entry.md");
    fs.writeFileSync(
      filePath,
      `---
id: MARKETING-2026-099
channel: reddit
status: pending
account: nova-gaia-research
scheduled: '2026-07-09 07:30 UTC'
owner: agent
voice: Nova
model: stepfun/step-3.7-flash
model_type: browser
target_repo: none
estimated_tokens: 1200
estimated_cost_usd: 0.00
link: https://www.reddit.com/r/MachineLearning/
labels:
  - social
  - research
prereqs:
  - IDEA-2026-003
priority: P2
placeholders: ""
---

# Nova Explorer: Reddit r/MachineLearning

Read the thread about smart context reduction and note safe follow-up angles.
`
    );

    const entry = QueueEntryAdapter.loadQueueEntry(filePath);
    const task = QueueEntryAdapter.toOperatorTask(entry);

    expect(task.id).toBe("MARKETING-2026-099");
    expect(task.platforms).toContain("reddit");
    expect(task.mode).toBe("research_and_draft");
    expect(task.risk_ceiling).toBe("L2");
    expect(task.outputs).toContain("markdown_report");
    expect(task.outputs).toContain("draft_replies_markdown");
    expect(task.constraints.auto_post).toBe(false);
    expect(task.constraints.auto_vote).toBe(false);
    expect(task.constraints.max_votes).toBe(0);
    expect(task.constraints.public_write_disabled).toBe(true);
    expect(task.objective).toContain("Read the thread about smart context reduction");
    expect((task.queries ?? []).length).toBeGreaterThan(0);
  });

  it("should infer safe constraints for Reddit explorer tasks", () => {
    const filePath = path.join(fixtureDir, "queue-entry-reddit-defaults.md");
    fs.writeFileSync(
      filePath,
      `---
id: MARKETING-2026-100
channel: reddit
status: pending
link: https://www.reddit.com/r/LocalLLaMA/
---

Lightweight explorer task.
`
    );

    const task = QueueEntryAdapter.parseFile(filePath);
    expect(task.platforms).toContain("reddit");
    expect(task.constraints.auto_post).toBe(false);
    expect(task.constraints.auto_vote).toBe(false);
    expect(task.constraints.max_comments).toBe(1);
    expect(task.constraints.max_votes).toBe(0);
    expect(task.constraints.public_write_disabled).toBe(true);
  });

  it("should throw on missing queue files", () => {
    expect(() => QueueEntryAdapter.parseFile("/tmp/does-not-exist.md")).toThrow(QueueEntryLoadError);
  });
});
