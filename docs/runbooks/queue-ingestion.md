# Runbook: Queue Ingestion

This runbook describes how to consume a `marketing-tasks` queue entry in `gaia-operator`.

## Step 1: Select a Queue Entry

Open the `marketing-tasks` queue folder and choose a pending entry file.

Preferred file pattern:
- `queue/<slug>.md`

Recommended filtering:
- `status: pending`
- `channel` or `platform` matching an available harness
- `owner: agent` or human-assigned owner

## Step 2: Map to a Runtime Task

Use the queue entry frontmatter as the source of truth. The runtime treats these fields as task inputs:

- `id`
- `title`
- `channel`
- `platform`
- `mode`
- `risk_ceiling`
- `voice`
- `guardrails`
- `queries`
- `constraints`
- `link`

If a field is missing, the runtime applies safe MVPs defaults:
- `reddit` defaults to `research_and_draft`
- public writes are disabled unless a later approved L4 flow is explicitly enabled
- approval is required for draft outputs

## Step 3: Validate the Derived Task

Before running, validate the mapped task schema and platform rules.

```bash
pnpm operator validate-task <derived-task-file>
```

If you need to inspect the inferred task without running it, print the mapped values from the adapter output.

## Step 4: Run the Task

Execute the mapped task under the policies model.

```bash
pnpm operator run-task <derived-task-file>
```

For queue-driven work, run one task at a time unless explicit task isolation is confirmed.

## Step 5: Review Artifacts

After completion or blockage, inspect:

- `report.md`
- `draft-replies.md`
- `approval-request.md`
- `blocked-state.md`
- `findings.jsonl`
- `opportunities.csv`
- `trace.json`

## Step 6: Sync Status Back

Copy the task result path into `marketing-tasks` and update queue status from `pending` to `completed`, `blocked`, or `failed`.

Use the result metadata fields:
- `task_id`
- `status`
- `artifacts`

## Safety Reminders

- Do not auto-post from queue tasks in the MVP.
- Do not bypass login, CAPTCHA, 2FA, or rate limits.
- If browser inspection is inconclusive, write a `blocked-state.md` and stop.
- Approval is required before any public interaction.
