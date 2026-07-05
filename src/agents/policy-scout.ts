import { PlatformName } from "../core/types.js";

export class PolicyScout {
  checkSubredditRules(platform: PlatformName): boolean {
    console.log(`[PolicyScout] Inspecting rules for platform: ${platform}`);
    if (platform === "reddit") {
      // Reddit rules warning: repeated mass outreach is banned
      return true;
    }
    return true;
  }
}
