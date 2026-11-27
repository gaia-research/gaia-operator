import { OperatorTask, InteractionOpportunity, ResultSummary } from "../../core/types.js";
import { TraceRecorder } from "../../core/trace-recorder.js";

export class CommunityInteractionHarness {
  executePublishStub(
    task: OperatorTask,
    opportunity: InteractionOpportunity,
    traceRecorder: TraceRecorder
  ): { status: "gated_and_disabled"; message: string } {
    // Recorded as a refusal: nothing was published, so this must not count as
    // a public action or be logged as an L4 step that was performed.
    traceRecorder.recordRefusal(
      "publish_attempt",
      "generic",
      "L4",
      { opportunityId: opportunity.id, targetUrl: opportunity.target_url },
      "Publishing is disabled in MVP"
    );

    console.warn(`[CommunityInteractionHarness] Public publish (L4) requested for opportunity '${opportunity.id}', but writing is disabled in the MVP.`);

    return {
      status: "gated_and_disabled",
      message: "L4 Public write actions are gated and disabled in the MVP. Explicit human approval via manual execution is required."
    };
  }
}
