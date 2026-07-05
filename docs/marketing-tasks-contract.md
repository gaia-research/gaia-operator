# marketing-tasks Contract Specification

`gaia-operator` acts as the execution engine for queues managed in `marketing-tasks`.

## Input Contract
A task YAML file containing:
```yaml
id: mt-unique-id
title: Task title
platforms: [reddit]
mode: research_and_draft
risk_ceiling: L3
guardrails:
  source: marketing-tasks
  refs: [guardrails/no-spam.md]
objective: Target description
queries: [query text]
constraints: { do_not_post: true }
outputs: [markdown_report, trace_json]
```

## Output Contract
Upon completion or blockage, results are written under `.gaia-operator/artifacts/<id>/` and synced to the `marketing-tasks` completed queue (`/queue/completed/<id>_result.json`).
The output result contains the task ID, final status (`completed | blocked | failed`), and absolute paths to all generated artifacts.
