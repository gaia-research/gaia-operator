import { BlockedState, PlatformName } from "./types.js";
import { StopConditionsChecker } from "../policies/stop-conditions.js";

export class BlockDetector {
  static detectBlock(
    taskId: string,
    platform: PlatformName,
    content: string,
    url?: string
  ): BlockedState | null {
    const result = StopConditionsChecker.checkContent(platform, content, url);
    if (result.shouldStop && result.blockType) {
      return {
        task_id: taskId,
        platform,
        url,
        block_type: result.blockType,
        description: result.description || "Blocked state detected",
        action_taken: "stopped",
        public_actions_taken: 0,
        recommended_human_action: this.getRecommendedAction(result.blockType),
        evidence_refs: []
      };
    }
    return null;
  }

  private static getRecommendedAction(blockType: string): string {
    switch (blockType) {
      case "captcha":
        return "Please resolve the CAPTCHA manually in a browser session.";
      case "login":
        return "Please log in to the platform and save session state.";
      case "2fa":
        return "Please complete the two-factor authentication challenge.";
      case "rate_limit":
        return "Please wait for the rate limit period to expire before retrying.";
      case "account_warning":
        return "Inspect the account status on the platform. Evasion is prohibited.";
      default:
        return "Please inspect the platform state and resolve manual verification.";
    }
  }
}
