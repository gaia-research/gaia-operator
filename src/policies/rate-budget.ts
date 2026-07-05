export class RateBudgetManager {
  private static requestCounts: Record<string, number> = {};
  private static limits: Record<string, number> = {
    reddit: 60, // requests per task run
    hackernews: 30,
    github: 60,
    discord: 30,
    linkedin: 10,
    x: 15,
    youtube: 20,
    generic: 50
  };

  static increment(platform: string): void {
    this.requestCounts[platform] = (this.requestCounts[platform] || 0) + 1;
  }

  static getUsage(platform: string): number {
    return this.requestCounts[platform] || 0;
  }

  static hasBudget(platform: string): boolean {
    const limit = this.limits[platform] || this.limits.generic;
    const current = this.requestCounts[platform] || 0;
    return current < limit;
  }

  static reset(): void {
    this.requestCounts = {};
  }
}
