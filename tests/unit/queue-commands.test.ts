import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { validateQueueEntryCommand, exportDerivedTaskCommand } from "../../src/cli/commands/queue-commands.js";

const FIXTURE_CONTENT = `---
id: queue-reddit-defaults
channel: reddit
mode: research_and_draft
status: pending
owner: agent
voice:
  persona_ref: personas/nova.md
---

Lightweight explorer task.
`;

describe("queue CLI commands", () => {
  it("validate-queue-entry prints derived task metadata", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gaia-queue-"));
    const queuePath = path.join(tempDir, "queue-entry.md");
    fs.writeFileSync(queuePath, FIXTURE_CONTENT);

    const logs: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    console.log = (...args) => logs.push(args.join(" "));
    console.error = (...args) => logs.push(args.join(" "));

    let exited = false;
    const originalExit = process.exit;
    process.exit = (code?: number) => {
      exited = true;
      if (code) throw new Error(`process.exit(${code})`);
    };

    try {
      validateQueueEntryCommand(queuePath);
    } finally {
      console.log = originalLog;
      console.error = originalError;
      process.exit = originalExit;
      fs.rmSync(tempDir, { recursive: true });
    }

    expect(exited).toBe(false);
    expect(logs.some((line) => line.includes("Derived task schema is valid!"))).toBe(true);
    expect(logs.some((line) => line.includes("Mode: research_and_draft"))).toBe(true);
  });

  it("export-derived-task writes a derived task file", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gaia-queue-"));
    const queuePath = path.join(tempDir, "queue-entry.md");
    fs.writeFileSync(queuePath, FIXTURE_CONTENT);
    const destination = path.join(tempDir, "derived.json");

    try {
      exportDerivedTaskCommand(queuePath, destination);
    } finally {
      fs.rmSync(tempDir, { recursive: true });
    }

    expect(fs.existsSync(destination)).toBe(true);
    const payload = JSON.parse(fs.readFileSync(destination, "utf-8"));
    expect(payload.id).toBe("queue-reddit-defaults");
    expect(payload.mode).toBe("research_and_draft");
  });
});
