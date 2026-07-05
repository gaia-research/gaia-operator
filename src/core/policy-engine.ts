import { OperatorTask, PlatformName, RiskLevel } from "./types.js";
import { PlatformPolicyRegistry } from "../policies/platform-policy-registry.js";
import { isActionAllowed } from "../policies/action-risk.js";
import { RateBudgetManager } from "../policies/rate-budget.js";
import { PolicyViolationError } from "./errors.js";

export class PolicyEngine {
  private enablePublicWrite: boolean;

  constructor(enablePublicWrite: boolean = false) {
    this.enablePublicWrite = enablePublicWrite;
  }

  validateTaskPolicies(task: OperatorTask): void {
    // Check each platform listed in the task
    for (const platform of task.platforms) {
      const config = PlatformPolicyRegistry.getPlatformConfig(platform);

      // Validate constraints don't request blocked actions
      // For instance, if the platform blocks "auto_dm", check task constraints
      for (const blocked of config.blockedActions) {
        if (task.constraints[blocked] === true) {
          throw new PolicyViolationError(
            `Task requests constraint '${blocked}' which is blocked on platform '${platform}'.`,
            "L5"
          );
        }
      }

      // Check task modes
      if (task.mode === "prepare_interaction" && config.defaultRiskCeiling === "L1") {
        throw new PolicyViolationError(
          `Task mode 'prepare_interaction' exceeds platform '${platform}' default risk ceiling of '${config.defaultRiskCeiling}'.`,
          "L3"
        );
      }

      // Ensure risk ceiling doesn't exceed allowed platform ceiling
      // e.g., if task is L4 (public write) but public write is disabled or not allowed on platform
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

    // 1. Is action explicitly blocked?
    if (config.blockedActions.includes(action)) {
      throw new PolicyViolationError(
        `Action '${action}' is explicitly blocked on platform '${platform}'.`,
        "L5"
      );
    }

    // 2. Does action exceed the risk ceiling?
    const check = isActionAllowed(action, taskCeiling, this.enablePublicWrite);
    if (!check.allowed) {
      throw new PolicyViolationError(
        check.reason || "Action exceeds allowed risk ceiling",
        taskCeiling,
        action
      );
    }

    // 3. Does platform have rate budget?
    if (!RateBudgetManager.hasBudget(platform)) {
      throw new PolicyViolationError(
        `Rate budget exceeded for platform '${platform}'.`,
        "L1",
        "rate_limit"
      );
    }

    // Increment budget request count
    RateBudgetManager.increment(platform);
  }
}
