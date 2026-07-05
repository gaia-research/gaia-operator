# Runbook: Reddit Research

This runbook guides operators executing Reddit research tasks.

## Step 1: Validate Task Config
Before running, validate the task schema:
```bash
pnpm operator validate-task templates/task.reddit-research.yaml
```

## Step 2: Run the Task
Execute the task:
```bash
pnpm operator run-task templates/task.reddit-research.yaml
```

## Step 3: Review Findings
Inspect the generated findings:
- View `report.md` in the artifacts folder for a summary.
- Inspect `draft-replies.md` to see generated Nova responses.
- Verify `trace.json` to confirm execution steps.
