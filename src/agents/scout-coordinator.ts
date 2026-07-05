import { OperatorTask, Finding } from "../core/types.js";
import { PlatformScout } from "./platform-scout.js";
import { PolicyScout } from "./policy-scout.js";

export class ScoutCoordinator {
  async runSwarm(task: OperatorTask): Promise<{ findings: Finding[]; warnings: string[] }> {
    console.log(`[ScoutCoordinator] Starting scouting swarm for task: ${task.id}`);
    
    const findings: Finding[] = [];
    const warnings: string[] = [];

    // Fan-out across platforms
    for (const platform of task.platforms) {
      console.log(`[ScoutCoordinator] Dispatching scout for platform: ${platform}`);
      
      // 1. Check policies first
      const policyScout = new PolicyScout();
      const isAllowed = policyScout.checkSubredditRules(platform);
      if (!isAllowed) {
        warnings.push(`Platform ${platform} has strict rules that might trigger moderation warnings.`);
      }

      // 2. Search platform
      const scout = new PlatformScout(platform);
      const scoutFindings = await scout.search(task.queries || []);
      findings.push(...scoutFindings.map(f => ({
        ...f,
        task_id: task.id
      })));
    }

    // Merge and deduplicate
    const uniqueFindings = this.deduplicate(findings);

    return {
      findings: uniqueFindings,
      warnings
    };
  }

  private deduplicate(findings: Finding[]): Finding[] {
    const seen = new Set<string>();
    return findings.filter(f => {
      if (seen.has(f.url)) return false;
      seen.add(f.url);
      return true;
    });
  }
}
