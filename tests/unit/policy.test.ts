import { describe, it, expect } from "vitest";
import { getActionRiskLevel, isActionAllowed } from "../../src/policies/action-risk.js";
import { PlatformPolicyRegistry } from "../../src/policies/platform-policy-registry.js";
import { PolicyEngine } from "../../src/core/policy-engine.js";

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
    // Action L4 is blocked when ceiling is L3
    const check1 = isActionAllowed("submit_post", "L3", false);
    expect(check1.allowed).toBe(false);

    // Action L2 is allowed when ceiling is L3
    const check2 = isActionAllowed("draft_reply", "L3", false);
    expect(check2.allowed).toBe(true);

    // Action L4 is blocked if public write is disabled globally
    const check3 = isActionAllowed("submit_post", "L4", false);
    expect(check3.allowed).toBe(false);

    // Action L4 is allowed if public write is enabled globally
    const check4 = isActionAllowed("submit_post", "L4", true);
    expect(check4.allowed).toBe(true);

    // Action L5 is always blocked
    const check5 = isActionAllowed("captcha_solving", "L5", true);
    expect(check5.allowed).toBe(false);
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
