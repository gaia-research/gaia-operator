import { OperatorTask, PlatformName, RiskLevel } from "./types.js";
import { PlatformPolicyRegistry } from "../policies/platform-policy-registry.js";
import { isActionAllowed, RISK_VALUES } from "../policies/action-risk.js";
import { RateBudgetManager } from "../policies/rate-budget.js";
import { PolicyViolationError } from "./errors.js";

const PUBLIC_ACTION_FLAGS = [
  "post",
  "comment",
  "reply",
  "publish",
  "dm",
  "message",
  "join",
  "follow",
  "vote",
  "like",
  "connect"
];

const ALWAYS_BLOCKED_CONSTRAINTS = [
  "auto_post",
  "auto_comment",
  "auto_reply",
  "auto_dm",
  "auto_message",
  "auto_vote",
  "auto_like",
  "auto_join",
  "auto_follow",
  "auto_connect",
  "account_creation",
  "create_account",
  "captcha_bypass",
  "captcha_solving",
  "proxy_rotation",
  "fingerprint_spoofing",
  "stealth_browser",
  "mass_reply",
  "mass_replies",
  "mass_dm",
  "mass_message",
  "scrape_private",
  "scraping_private_servers",
  "repetitive_promotion"
];

export class PolicyEngine {
  private enablePublicWrite: boolean;

  constructor(enablePublicWrite: boolean = false) {
    this.enablePublicWrite = enablePublicWrite;
  }

  validateTaskPolicies(task: OperatorTask): void {
    this.validateRiskCeiling(task.risk_ceiling);
    this.validateConstraintIntent(task);

    for (const platform of task.platforms) {
      const config = PlatformPolicyRegistry.getPlatformConfig(platform);

      for (const blocked of config.blockedActions) {
        if (task.constraints[blocked] === true) {
          throw new PolicyViolationError(
            `Task requests constraint '${blocked}' which is blocked on platform '${platform}'.`,
            "L5",
            blocked
          );
        }
      }

      if (task.mode === "prepare_interaction" && RISK_VALUES[config.defaultRiskCeiling] < RISK_VALUES.L3) {
        throw new PolicyViolationError(
          `Task mode 'prepare_interaction' exceeds platform '${platform}' default risk ceiling of '${config.defaultRiskCeiling}'.`,
          "L3"
        );
      }

      if (RISK_VALUES[task.risk_ceiling] > RISK_VALUES[config.defaultRiskCeiling] && !this.enablePublicWrite) {
        throw new PolicyViolationError(
          `Task risk ceiling '${task.risk_ceiling}' exceeds platform '${platform}' default ceiling '${config.defaultRiskCeiling}'.`,
          task.risk_ceiling
        );
      }

      const allowedCheck = isActionAllowed(
        `run_${task.mode}`,
        task.risk_ceiling,
        this.enablePublicWrite
      );

      if (!allowedCheck.allowed) {
        throw new PolicyViolationError(
          allowedCheck.reason || "Policy ceiling check failed",
          task.risk_ceiling
        );
      }
    }
  }

  checkAction(platform: PlatformName, action: string, taskCeiling: RiskLevel): void {
    const config = PlatformPolicyRegistry.getPlatformConfig(platform);

    if (config.blockedActions.includes(action)) {
      throw new PolicyViolationError(
        `Action '${action}' is explicitly blocked on platform '${platform}'.`,
        "L5",
        action
      );
    }

    const check = isActionAllowed(action, taskCeiling, this.enablePublicWrite);
    if (!check.allowed) {
      throw new PolicyViolationError(
        check.reason || "Action exceeds allowed risk ceiling",
        taskCeiling,
        action
      );
    }

    if (!RateBudgetManager.hasBudget(platform)) {
      throw new PolicyViolationError(
        `Rate budget exceeded for platform '${platform}'.`,
        "L1",
        "rate_limit"
      );
    }

    RateBudgetManager.increment(platform);
  }

  private validateRiskCeiling(riskCeiling: RiskLevel): void {
    if (riskCeiling === "L5") {
      throw new PolicyViolationError(
        "Task risk ceiling L5 is prohibited. Gaia Operator must never execute sensitive or evasive actions.",
        "L5"
      );
    }

    if (riskCeiling === "L4" && !this.enablePublicWrite) {
      throw new PolicyViolationError(
        "Task risk ceiling L4 requests public writes, but ENABLE_PUBLIC_WRITE is false. MVP runs must stop at L3 or lower.",
        "L4"
      );
    }
  }

  private validateConstraintIntent(task: OperatorTask): void {
    for (const key of ALWAYS_BLOCKED_CONSTRAINTS) {
      if (task.constraints[key] === true) {
        throw new PolicyViolationError(
          `Task constraint '${key}' requests prohibited automation and is always blocked.`,
          "L5",
          key
        );
      }
    }

    if (!this.enablePublicWrite) {
      for (const flag of PUBLIC_ACTION_FLAGS) {
        const allowKey = `allow_${flag}`;
        const autoKey = `auto_${flag}`;
        if (task.constraints[allowKey] === true || task.constraints[autoKey] === true) {
          throw new PolicyViolationError(
            `Task constraint '${allowKey}'/'${autoKey}' conflicts with ENABLE_PUBLIC_WRITE=false. Public actions are draft-only in MVP.`,
            "L4",
            allowKey
          );
        }
      }
    }
  }
}
