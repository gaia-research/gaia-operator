import { BlockedState, PlatformName } from "../core/types.js";
import { PlatformPolicyRegistry } from "./platform-policy-registry.js";

export class StopConditionsChecker {
  static checkContent(
    platform: PlatformName,
    content: string,
    url?: string
  ): { shouldStop: boolean; blockType?: BlockedState["block_type"]; description?: string } {
    const config = PlatformPolicyRegistry.getPlatformConfig(platform);
    const lowercaseContent = content.toLowerCase();

    // Check CAPTCHA
    if (
      config.stopConditions.includes("captcha") &&
      (lowercaseContent.includes("captcha") ||
        lowercaseContent.includes("hcaptcha") ||
        lowercaseContent.includes("recaptcha") ||
        lowercaseContent.includes("g-recaptcha") ||
        lowercaseContent.includes("please complete the security check") ||
        lowercaseContent.includes("verify you are a human"))
    ) {
      return {
        shouldStop: true,
        blockType: "captcha",
        description: "CAPTCHA check detected in page content."
      };
    }

    // Check Login Challenge
    if (
      config.stopConditions.includes("login_challenge") &&
      (lowercaseContent.includes("login") ||
        lowercaseContent.includes("sign in") ||
        lowercaseContent.includes("log in to continue") ||
        lowercaseContent.includes("create an account or log in"))
    ) {
      // For some public pages like reddit, a login wall might block further reading
      return {
        shouldStop: true,
        blockType: "login",
        description: "Login wall or challenge detected."
      };
    }

    // Check Rate Limit
    if (
      config.stopConditions.includes("rate_limit") &&
      (lowercaseContent.includes("rate limit") ||
        lowercaseContent.includes("too many requests") ||
        lowercaseContent.includes("429") ||
        lowercaseContent.includes("slow down"))
    ) {
      return {
        shouldStop: true,
        blockType: "rate_limit",
        description: "Rate limit message or 429 response status detected."
      };
    }

    // Check Account Warning
    if (
      config.stopConditions.includes("account_warning") &&
      (lowercaseContent.includes("suspended") ||
        lowercaseContent.includes("banned") ||
        lowercaseContent.includes("violating terms") ||
        lowercaseContent.includes("unusual activity"))
    ) {
      return {
        shouldStop: true,
        blockType: "account_warning",
        description: "Account suspension or ban warning detected."
      };
    }

    return { shouldStop: false };
  }
}
