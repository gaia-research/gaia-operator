import { describe, it, expect } from "vitest";
import { getActionRiskLevel, isActionAllowed } from "../../src/policies/action-risk.js";
import { PlatformPolicyRegistry } from "../../src/policies/platform-policy-registry.js";
import { PolicyEngine } from "../../src/core/policy-engine.js";
import { OperatorTask } from "../../src/core/types.js";

const baseTask: OperatorTask = {
  id: "policy-test",
  title: "Policy Test",
  platforms: ["reddit"],
  mode: "research_and_draft",
  risk_ceiling: "L3",
  guardrails: { source: "local", refs: [] },
  objective: "Test policy engine",
  queries: ["browser agents"],
  constraints: { do_not_post: true },
  outputs: ["markdown_report"]
};

describe("Action Risk Policy", () => {
  it("should correctly classify risk levels", () => {
    expect(getActionRiskLevel("read_public_page")).toBe("L0");
    expect(getActionRiskLevel("summarize_comments")).toBe("L1");
    expect(getActionRiskLevel("draft_reply")).toBe("L2");
    expect(getActionRiskLevel("fill_text_box")).toBe("L3");
    expect(getActionRiskLevel("submit_post")).toBe("L4");
    expect(getActionRiskLevel("captcha_solving")).toBe("L5");
  });

  it("should validate risk ceiling constraints", () => {
    expect(isActionAllowed("submit_post", "L3", false).allowed).toBe(false);
    expect(isActionAllowed("draft_reply", "L3", false).allowed).toBe(true);
    expect(isActionAllowed("submit_post", "L4", false).allowed).toBe(false);
    expect(isActionAllowed("submit_post", "L4", true).allowed).toBe(true);
    expect(isActionAllowed("captcha_solving", "L5", true).allowed).toBe(false);
  });

  it("should reject L4 task ceilings while public writes are disabled", () => {
    const engine = new PolicyEngine(false);
    expect(() => engine.validateTaskPolicies({ ...baseTask, risk_ceiling: "L4" })).toThrow(/ENABLE_PUBLIC_WRITE is false/);
  });

  it("should reject L5 task ceilings always", () => {
    const engine = new PolicyEngine(true);
    expect(() => engine.validateTaskPolicies({ ...baseTask, risk_ceiling: "L5" })).toThrow(/prohibited/);
  });

  it("should reject prohibited automation constraints", () => {
    const engine = new PolicyEngine(false);
    
    // auto_dm
    expect(() => engine.validateTaskPolicies({
      ...baseTask,
      constraints: { ...baseTask.constraints, auto_dm: true }
    })).toThrow(/prohibited automation|blocked/);

    // proxy_rotation
    expect(() => engine.validateTaskPolicies({
      ...baseTask,
      constraints: { ...baseTask.constraints, proxy_rotation: true }
    })).toThrow(/prohibited automation|blocked/);

    // fingerprint_spoofing
    expect(() => engine.validateTaskPolicies({
      ...baseTask,
      constraints: { ...baseTask.constraints, fingerprint_spoofing: true }
    })).toThrow(/prohibited automation|blocked/);
  });
});

describe("Platform Registry", () => {
  it("should fetch reddit policy correctly", () => {
    const redditConfig = PlatformPolicyRegistry.getPlatformConfig("reddit");
    expect(redditConfig.name).toBe("reddit");
    expect(redditConfig.blockedActions).toContain("auto_dm");
    expect(redditConfig.stopConditions).toContain("captcha");
  });
});
