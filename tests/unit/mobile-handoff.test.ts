import { describe, it, expect } from "vitest";
import { MobileHandoffHarness, MobileHandoffTaskSchema } from "../../src/harnesses/mobile-handoff/index.js";
import { checkGuardrails, generateDraft } from "../../src/harnesses/mobile-handoff/prepare.js";
import { generateHandoffCard, generateBlockedCard } from "../../src/harnesses/mobile-handoff/approval-card.js";
import { mapStatus, ALLOWED_STATUSES } from "../../src/harnesses/mobile-handoff/result-capture.js";

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

  it("should correctly verify guardrails", () => {
    const task = MobileHandoffTaskSchema.parse(validTaskPayload);
    const draftText = generateDraft(task);
    const res = checkGuardrails(task, draftText);
    expect(res.passed).toBe(true);
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
});
