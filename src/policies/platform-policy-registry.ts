import { PlatformName, RiskLevel } from "../core/types.js";

export interface PlatformConfig {
  name: PlatformName;
  allowedAccessModes: ("api" | "browser" | "cua_fallback")[];
  defaultRiskCeiling: RiskLevel;
  publicWriteEnabledByDefault: boolean;
  blockedActions: string[];
  stopConditions: string[];
}

export class PlatformPolicyRegistry {
  private static platforms: Record<PlatformName, PlatformConfig> = {
    reddit: {
      name: "reddit",
      allowedAccessModes: ["api", "browser", "cua_fallback"],
      defaultRiskCeiling: "L3",
      publicWriteEnabledByDefault: false,
      blockedActions: [
        "auto_dm",
        "auto_vote",
        "auto_join",
        "account_creation",
        "captcha_bypass",
        "mass_reply",
        "repetitive_promotion"
      ],
      stopConditions: [
        "captcha",
        "login_challenge",
        "human_verification",
        "rate_limit",
        "account_warning",
        "community_rule_unclear"
      ]
    },
    hackernews: {
      name: "hackernews",
      allowedAccessModes: ["api", "browser"],
      defaultRiskCeiling: "L1",
      publicWriteEnabledByDefault: false,
      blockedActions: [
        "auto_commenting",
        "voting",
        "account_automation",
        "repeated_self_promotion",
        "captcha_bypass"
      ],
      stopConditions: [
        "captcha",
        "login_challenge",
        "rate_limit",
        "account_warning"
      ]
    },
    github: {
      name: "github",
      allowedAccessModes: ["api", "browser"],
      defaultRiskCeiling: "L3",
      publicWriteEnabledByDefault: false,
      blockedActions: [
        "mass_issues",
        "spam_comments",
        "captcha_bypass"
      ],
      stopConditions: [
        "captcha",
        "login_challenge",
        "rate_limit"
      ]
    },
    discord: {
      name: "discord",
      allowedAccessModes: ["api", "cua_fallback"],
      defaultRiskCeiling: "L2",
      publicWriteEnabledByDefault: false,
      blockedActions: [
        "scraping_private_servers",
        "unsolicited_dms",
        "auto_join_servers",
        "captcha_bypass"
      ],
      stopConditions: [
        "captcha",
        "login_challenge",
        "rate_limit",
        "account_warning"
      ]
    },
    linkedin: {
      name: "linkedin",
      allowedAccessModes: ["browser", "cua_fallback"],
      defaultRiskCeiling: "L2",
      publicWriteEnabledByDefault: false,
      blockedActions: [
        "auto_connect",
        "auto_message",
        "auto_comment",
        "auto_like",
        "scraping_profiles",
        "captcha_bypass"
      ],
      stopConditions: [
        "captcha",
        "login_challenge",
        "rate_limit",
        "account_warning"
      ]
    },
    x: {
      name: "x",
      allowedAccessModes: ["api", "browser", "cua_fallback"],
      defaultRiskCeiling: "L2",
      publicWriteEnabledByDefault: false,
      blockedActions: [
        "auto_follow",
        "auto_like",
        "auto_reply",
        "auto_dm",
        "trend_manipulation",
        "repeated_posting",
        "captcha_bypass"
      ],
      stopConditions: [
        "captcha",
        "login_challenge",
        "rate_limit",
        "account_warning"
      ]
    },
    youtube: {
      name: "youtube",
      allowedAccessModes: ["api", "browser"],
      defaultRiskCeiling: "L2",
      publicWriteEnabledByDefault: false,
      blockedActions: [
        "auto_commenting",
        "mass_replies",
        "channel_changes",
        "captcha_bypass"
      ],
      stopConditions: [
        "captcha",
        "login_challenge",
        "rate_limit"
      ]
    },
    generic: {
      name: "generic",
      allowedAccessModes: ["api", "browser", "cua_fallback"],
      defaultRiskCeiling: "L2",
      publicWriteEnabledByDefault: false,
      blockedActions: [
        "captcha_bypass",
        "spam_outreach"
      ],
      stopConditions: [
        "captcha",
        "login_challenge",
        "rate_limit"
      ]
    }
  };

  static getPlatformConfig(name: PlatformName): PlatformConfig {
    const config = this.platforms[name];
    if (!config) {
      throw new Error(`Platform '${name}' is not registered in the policy registry.`);
    }
    return config;
  }

  static getRegisteredPlatforms(): PlatformName[] {
    return Object.keys(this.platforms) as PlatformName[];
  }
}
