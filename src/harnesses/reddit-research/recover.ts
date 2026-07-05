import { BlockedState } from "../../core/types.js";
import { BlockedSessionError } from "../../core/errors.js";

export class RedditRecoveryHandler {
  static handleBlock(error: BlockedSessionError): BlockedState {
    console.warn(`[RedditRecoveryHandler] Recovery initiated for block type: ${error.blockType}`);

    return {
      task_id: "",
      platform: "reddit",
      url: error.url,
      block_type: error.blockType as any,
      description: `Reddit adapter hit block: ${error.message}`,
      action_taken: "stopped",
      public_actions_taken: 0,
      recommended_human_action: this.getRecommendedAction(error.blockType),
      evidence_refs: error.screenshotPath ? [error.screenshotPath] : []
    };
  }

  private static getRecommendedAction(blockType: string): string {
    if (blockType === "captcha") {
      return "Stop the automation. A human may inspect the browser manually, but Gaia Operator must not solve or bypass CAPTCHA.";
    }
    if (blockType === "login" || blockType === "2fa" || blockType === "human_verification") {
      return "Stop the automation. Complete authentication manually outside the agent flow, then rerun only if the platform and task allow it.";
    }
    if (blockType === "rate_limit") {
      return "Stop the run and wait for the platform rate limit window to recover. Do not switch accounts, proxies, or fingerprints.";
    }
    return "A platform challenge was detected. Switch to manual review or an allowed official API path.";
  }
}
