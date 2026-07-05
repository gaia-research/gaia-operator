import { ResultSummary } from "../core/types.js";
import { MarketingTasksAdapter } from "../adapters/filesystem/marketing-tasks-adapter.js";

export class SyncAgent {
  private marketingAdapter: MarketingTasksAdapter;

  constructor() {
    this.marketingAdapter = new MarketingTasksAdapter();
  }

  async syncResultToQueue(taskId: string, result: ResultSummary): Promise<void> {
    console.log(`[SyncAgent] Syncing task '${taskId}' status to marketing-tasks queue...`);
    this.marketingAdapter.syncResult(taskId, result);
  }
}
