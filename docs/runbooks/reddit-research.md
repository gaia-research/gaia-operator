# Runbook: Reddit Research

This runbook guides operators executing Reddit research tasks from `marketing-tasks` queue entries.

## Fast Path

1. Pick a queue entry from `marketing-tasks/queue`.
2. Run `pnpm operator run-task <derived-task-file>` or a queue-specific loader when available.
3. Review `report.md`, `draft-replies.md`, and `blocked-state.md` if present.
4. Update queue status in `marketing-tasks` after review.

## Step 1: Validate Task Input

Prefer derived task files created from queue entries. If you start from raw queue markdown, map it first.

Validate the mapped task:

```bash
pnpm operator validate-task <derived-task-file>
```

## Step 2: Run the Task

```bash
pnpm operator run-task <derived-task-file>
```

Expected default behavior for Reddit:
- mode: `research_and_draft`
- public writes: disabled
- approval required: true
- outputs: `markdown_report`, `draft_replies_markdown`, `approval_request_markdown`, `trace_json`

## Step 3: Review Findings

Inspect generated outputs:
- `report.md`
- `draft-replies.md`
- `approval-request.md`
- `blocked-state.md`
- `trace.json`

## Step 4: Approval and Sync

Use `approval-request.md` for human review. Do not auto-post in MVP.

If blocked:
1. Read `blocked-state.md`
2. Resolve the blocking condition manually
3. Re-run only after approval and environment readiness

Sync results back to `marketing-tasks` queue status.
