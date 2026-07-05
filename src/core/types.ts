export type PlatformName = "reddit" | "hackernews" | "github" | "discord" | "linkedin" | "x" | "youtube" | "generic";

export type OutputType = 
  | "markdown_report" 
  | "findings_jsonl" 
  | "opportunities_csv" 
  | "draft_replies_markdown" 
  | "evidence_screenshots_when_browser_used"
  | "trace_json"
  | "blocked_state_markdown"
  | "approval_request_markdown";

export type RiskLevel = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";

export interface OperatorTask {
  id: string;
  title: string;
  campaign?: string;
  platforms: PlatformName[];
  mode: "research" | "research_and_draft" | "prepare_interaction";
  risk_ceiling: RiskLevel;
  voice?: {
    persona_ref?: string;
    soul_ref?: string;
  };
  guardrails: {
    source: "marketing-tasks" | "local";
    refs: string[];
  };
  objective: string;
  queries?: string[];
  constraints: Record<string, boolean | string | number>;
  outputs: OutputType[];
}

export interface Finding {
  id: string;
  task_id: string;
  platform: PlatformName;
  community?: string;
  url: string;
  title?: string;
  summary: string;
  excerpt?: string;
  relevance_score: number; // 0 to 1
  interaction_risk: "low" | "medium" | "high" | "blocked";
  recommended_action: "observe" | "draft" | "skip" | "approval_required";
  evidence_refs: string[];
}

export interface InteractionOpportunity {
  id: string;
  finding_id: string;
  target_url: string;
  community: string;
  user_need: string;
  suggested_angle: string;
  draft_reply?: string;
  nova_voice_status: "applied" | "needs_persona_sync" | "neutral_fallback";
  risk_level: RiskLevel;
  approval_required: boolean;
  reasons_to_skip?: string[];
}

export interface BlockedState {
  task_id: string;
  platform: PlatformName;
  url?: string;
  block_type:
    | "captcha"
    | "login"
    | "2fa"
    | "human_verification"
    | "rate_limit"
    | "policy_unclear"
    | "community_rule_conflict"
    | "account_warning"
    | "tool_failure";
  description: string;
  action_taken: "stopped";
  public_actions_taken: number;
  recommended_human_action: string;
  evidence_refs: string[];
}

export interface TraceStep {
  step_id: string;
  action: string;
  platform?: PlatformName;
  risk_level: RiskLevel;
  input: Record<string, any>;
  output: Record<string, any>;
  timestamp: string;
}

export interface Trace {
  task_id: string;
  status: "pending" | "running" | "completed" | "failed" | "blocked";
  risk_ceiling_used: RiskLevel;
  public_actions_taken: number;
  approval_required: boolean;
  steps: TraceStep[];
  created_at: string;
  completed_at?: string;
  error?: string;
}

export interface ResultSummary {
  task_id: string;
  status: "completed" | "failed" | "blocked";
  risk_ceiling_used: RiskLevel;
  public_actions_taken: number;
  approval_required: boolean;
  artifacts: {
    report?: string;
    findings?: string;
    opportunities?: string;
    draft_replies?: string;
    trace?: string;
    blocked_state?: string;
    approval_request?: string;
  };
  blocked: boolean;
  recommended_next_action: string;
}
