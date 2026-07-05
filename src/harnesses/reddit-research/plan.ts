import { OperatorTask } from "../../core/types.js";

export interface PlanStep {
  name: string;
  description: string;
}

export function buildRedditPlan(task: OperatorTask): PlanStep[] {
  const steps: PlanStep[] = [];
  steps.push({
    name: "policy_check",
    description: "Validate task constraints against platform policies"
  });
  steps.push({
    name: "init_adapters",
    description: "Initialize Playwright or Reddit API adapters"
  });
  
  const queries = task.queries || ["browser agent reddit blocking"];
  for (const query of queries) {
    steps.push({
      name: "search",
      description: `Search Reddit threads for query: "${query}"`
    });
  }
  
  steps.push({
    name: "extract_details",
    description: "Process threads, extract pain points, and score relevance"
  });

  if (task.mode === "research_and_draft" || task.mode === "prepare_interaction") {
    steps.push({
      name: "draft_replies",
      description: "Draft Nova-style responses for eligible candidates"
    });
  }

  steps.push({
    name: "export_artifacts",
    description: "Write reports, CSVs, and traces"
  });

  return steps;
}
