import { describe, it, expect, vi } from "vitest";
import { MobileHandoffHarness, MobileHandoffTaskSchema } from "../../src/harnesses/mobile-handoff/index.js";
import { checkGuardrails, generateDraft } from "../../src/harnesses/mobile-handoff/prepare.js";
import { generateHandoffCard, generateBlockedCard } from "../../src/harnesses/mobile-handoff/approval-card.js";
import { mapStatus, ResultCapture } from "../../src/harnesses/mobile-handoff/result-capture.js";
import { TermuxApiAdapter } from "../../src/adapters/mobile/termux-api-adapter.js";
import { ClipboardAdapter } from "../../src/adapters/mobile/clipboard-adapter.js";
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";

vi.mock("child_process", async () => {
  const actual = await vi.importActual<typeof import("child_process")>("child_process");
  return {
    ...actual,
    spawnSync: vi.fn((cmd, args, opts) => {
      if (cmd === "which") {
        return { status: 0, stdout: "/usr/bin/which", stderr: "" };
      }
      return { status: 0, stdout: "mock-output", stderr: "" };
    })
  };
});

describe("Mobile Handoff Harness Unit Tests", () => {
  const validTaskPayload = {
    id: "mh-test-001",
    type: "mobile_handoff",
    platform: "reddit",
    mode: "prepare_for_manual_reply",
    risk_ceiling: "L3",
    target: {
      url: "https://www.reddit.com/r/example/comments/1",
      community: "r/example",
      context_summary: "User needs browser automation assistance"
    },
    voice: {
      persona_ref: "personas/nova.md",
      soul_ref: "Soul.md"
    },
    guardrails: {
      source: "marketing-tasks",
      refs: ["guardrails/no-spam.md"]
    },
    draft: {
      mode: "generate",
      instruction: "Helpful response"
    },
    constraints: {
      auto_post: false,
      auto_dm: false,
      require_manual_publish: true,
      copy_to_clipboard: true,
      open_url: true,
      notify_user: true
    },
    outputs: ["handoff_card", "draft_text"]
  };

  it("should validate a correct mobile handoff task schema", () => {
    const parseResult = MobileHandoffTaskSchema.safeParse(validTaskPayload);
    expect(parseResult.success).toBe(true);
  });

  it("should reject schemas where auto_post is true", () => {
    const invalidPayload = {
      ...validTaskPayload,
      constraints: {
        ...validTaskPayload.constraints,
        auto_post: true
      }
    };
    const parseResult = MobileHandoffTaskSchema.safeParse(invalidPayload);
    expect(parseResult.success).toBe(false);
  });

  // Fix 1 test: L4/L5 risk ceiling rejection
  it("should reject L4 and L5 risk ceilings at schema level", () => {
    const invalidL4 = {
      ...validTaskPayload,
      risk_ceiling: "L4"
    };
    const invalidL5 = {
      ...validTaskPayload,
      risk_ceiling: "L5"
    };
    expect(MobileHandoffTaskSchema.safeParse(invalidL4).success).toBe(false);
    expect(MobileHandoffTaskSchema.safeParse(invalidL5).success).toBe(false);
  });

  it("should correctly verify guardrails", () => {
    const task = MobileHandoffTaskSchema.parse(validTaskPayload);
    const draftText = generateDraft(task);
    const res = checkGuardrails(task, draftText);
    expect(res.passed).toBe(true);
  });

  // Fix 2 test: platform/URL compatibility checks
  it("should reject task if target URL does not match platform", () => {
    const mismatchedReddit = {
      ...validTaskPayload,
      platform: "reddit",
      target: {
        url: "https://www.github.com/some/issue",
        community: "r/example"
      }
    };
    const task = MobileHandoffTaskSchema.parse(mismatchedReddit);
    const res = checkGuardrails(task, "Hello World");
    expect(res.passed).toBe(false);
    expect(res.violations[0]).toContain("Platform 'reddit' requires a target URL containing 'reddit.com'");
  });

  it("should fail guardrails if draft has spammy word patterns", () => {
    const task = MobileHandoffTaskSchema.parse(validTaskPayload);
    const spammyDraft = "repetition repetition repetition repetition repetition repetition repetition repetition repetition";
    const res = checkGuardrails(task, spammyDraft);
    expect(res.passed).toBe(false);
    expect(res.violations[0]).toContain("repetitive word patterns");
  });

  it("should fail guardrails if draft relies only on a link", () => {
    const task = MobileHandoffTaskSchema.parse(validTaskPayload);
    const linkOnlyDraft = "https://example.com/some/long/link/url/here";
    const res = checkGuardrails(task, linkOnlyDraft);
    expect(res.passed).toBe(false);
    expect(res.violations[0]).toContain("too short and contains a link");
  });

  it("should generate a proper handoff card layout", () => {
    const task = MobileHandoffTaskSchema.parse(validTaskPayload);
    const draftText = "Check out our API config guide.";
    const card = generateHandoffCard(task, draftText);

    expect(card).toContain("# Mobile Handoff: Reddit Reply");
    expect(card).toContain("Platform: Reddit");
    expect(card).toContain("URL: https://www.reddit.com/r/example/comments/1");
    expect(card).toContain("Check out our API config guide.");
    expect(card).toContain("gaia-mobile result mh-test-001 --status posted");
  });

  it("should generate a blocked card layout on violation", () => {
    const task = MobileHandoffTaskSchema.parse(validTaskPayload);
    const violations = ["auto_post must be false", "auto_dm must be false"];
    const card = generateBlockedCard(task, violations);

    expect(card).toContain("# Mobile Handoff BLOCKED: Reddit Reply");
    expect(card).toContain("auto_post must be false");
    expect(card).toContain("auto_dm must be false");
  });

  it("should correctly map command-line status aliases", () => {
    expect(mapStatus("posted")).toBe("posted");
    expect(mapStatus("posted_with_edits")).toBe("posted_with_edits");
    expect(mapStatus("saved")).toBe("saved_for_later");
    expect(mapStatus("rejected")).toBe("rejected");
  });

  // Fix 3 test: share disabled by default
  it("should default share_payload to false in schema", () => {
    const parsed = MobileHandoffTaskSchema.parse(validTaskPayload);
    expect(parsed.constraints.share_payload).toBe(false);
  });

  // Fix 4 test: result capture without prepared artifacts
  it("should reject result capture without prepared artifacts unless forced", () => {
    const randomId = `nonexistent-task-${Date.now()}`;
    
    // Attempt without force
    const failRes = ResultCapture.record({
      taskId: randomId,
      status: "posted"
    });
    expect(failRes.success).toBe(false);
    expect(failRes.message).toContain("No prepared handoff artifacts found");

    // Attempt with force
    const successRes = ResultCapture.record({
      taskId: randomId,
      status: "posted",
      force: true
    });
    expect(successRes.success).toBe(true);

    // Verify unverified_capture flag is set
    const resultFile = path.resolve(process.cwd(), ".gaia-operator", "mobile", "handoffs", randomId, "result.json");
    expect(fs.existsSync(resultFile)).toBe(true);
    const content = JSON.parse(fs.readFileSync(resultFile, "utf-8"));
    expect(content.unverified_capture).toBe(true);

    // Clean up
    fs.rmSync(path.dirname(resultFile), { recursive: true, force: true });
    const altResultFile = path.resolve(process.cwd(), "artifacts", "mobile-handoff", randomId);
    fs.rmSync(altResultFile, { recursive: true, force: true });
  });

  // Fix 5 test: shell-safe command execution behavior
  it("should use spawnSync instead of shell execution", () => {
    TermuxApiAdapter.runCommand("mock-cmd", ["arg1", "arg 2; rm -rf /"]);
    expect(spawnSync).toHaveBeenCalledWith(
      "mock-cmd", 
      ["arg1", "arg 2; rm -rf /"], 
      expect.objectContaining({ stdio: expect.any(Array) })
    );
  });
});
