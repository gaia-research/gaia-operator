import { BlockedState } from "../../core/types.js";
import { BlockedSessionError } from "../../core/errors.js";

export class RedditRecoveryHandler {
  static handleBlock(error: BlockedSessionError): BlockedState {
    console.warn(`[RedditRecoveryHandler] Recovery initiated for block type: ${error.blockType}`);
    
    return {
      task_id: "", // caller fills this
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
      return "Please run a local browser, solve the CAPTCHA, and save the session cookie state.";
    }
    if (blockType === "login") {
      return "Please login using standard browser credentials. Evasion is disabled.";
    }
    return "A challenge was detected. Switch execution to manual or API mode.";
  }
}
