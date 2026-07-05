import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { validateQueueEntryCommand, exportDerivedTaskCommand } from "../../src/cli/commands/queue-commands.js";

const queueFixture = `---
id: mt-test-reddit
title: Reddit browser-agent research
channel: reddit
priority: medium
---

Find Reddit discussions about browser agents, CUA, Playwright MCP, and blocking.
`;

describe("queue CLI commands", () => {
  it("validate-queue-entry prints derived task metadata", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gaia-queue-"));
    const queuePath = path.join(tempDir, "queue-entry.md");
    fs.writeFileSync(queuePath, queueFixture);

    const logs: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    console.log = (...args) => logs.push(args.join(" "));
    console.error = (...args) => logs.push(args.join(" "));

    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((code?: string | number | null | undefined) => {
        throw new Error(`process.exit ${code}`);
      }) as unknown as ReturnType<typeof vi.spyOn>;

    try {
      validateQueueEntryCommand(queuePath);
    } finally {
      console.log = originalLog;
      console.error = originalError;
      exitSpy.mockRestore();
      fs.rmSync(tempDir, { recursive: true });
    }

    expect(exitSpy).not.toHaveBeenCalled();
    expect(logs.some((line) => line.includes("Derived task schema is valid!"))).toBe(true);
    expect(logs.some((line) => line.includes("Mode: research_and_draft"))).toBe(true);
  });

  it("export-derived-task writes a derived task file", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gaia-queue-"));
    const queuePath = path.join(tempDir, "queue-entry.md");
    fs.writeFileSync(queuePath, queueFixture);
    const destination = path.join(tempDir, "derived.json");

    try {
      exportDerivedTaskCommand(queuePath, destination);
      expect(fs.existsSync(destination)).toBe(true);
      const payload = JSON.parse(fs.readFileSync(destination, "utf-8"));
      expect(payload.id).toBe("mt-test-reddit");
      expect(payload.mode).toBe("research_and_draft");
    } finally {
      fs.rmSync(tempDir, { recursive: true });
    }
  });
});
