# Gaia Operator Mobile Handoff Runbook

This runbook guides you through using the Gaia Mobile Handoff CLI (`gaia-mobile` / `gmh`) in Termux or local development mode.

---

## 1. Quick Commands Reference

| Operation | Command | Alias Command |
|---|---|---|
| **Validate Task** | `gaia-mobile validate <task_file>` | |
| **Prepare Handoff** | `gaia-mobile prepare <task_file>` | `gmh prepare <task_file>` |
| **Execute Handoff** | `gaia-mobile handoff <task_file>` | `gmh handoff <task_file>` |
| **Record Result (Custom)** | `gaia-mobile result <task_id> --status <status>` | |
| **Record Result (Shortcut)** | `gaia-mobile result <task_id> --status posted` | `gmh posted <task_id>` |
| **Record Result (Rejected)** | `gaia-mobile result <task_id> --status rejected` | `gmh rejected <task_id>` |
| **Record Result (Saved)** | `gaia-mobile result <task_id> --status saved` | `gmh saved <task_id>` |
| **Doctor Diagnostic** | `gaia-mobile doctor` | |

---

## 2. Standard Handoff Flow

### Step 2.1: Intake
Provide or generate a YAML task configuration matching the handoff schema:
```yaml
# tasks/reddit-reply.yaml
id: mh-2026-07-reddit-001
type: mobile_handoff
platform: reddit
mode: prepare_for_manual_reply
risk_ceiling: L3
target:
  url: "https://www.reddit.com/r/example/comments/123456/how_to_avoid_blocking"
  community: "r/example"
  context_summary: "Developer is asking about browser agent blocking."
voice:
  persona_ref: "personas/nova.md"
  soul_ref: "Soul.md"
guardrails:
  source: "marketing-tasks"
  refs:
    - "guardrails/no-spam.md"
draft:
  mode: generate
  instruction: "Write a concise, helpful reply."
constraints:
  auto_post: false
  auto_dm: false
  require_manual_publish: true
```

### Step 2.2: Prepare Handoff
Build the draft and handoff card by running:
```bash
gaia-mobile prepare tasks/reddit-reply.yaml
```
*Creates the card and draft under `.gaia-operator/mobile/handoffs/mh-2026-07-reddit-001/` and validates all security guardrails.*

### Step 2.3: Execute Handoff
Copy the draft and launch the URL:
```bash
gaia-mobile handoff tasks/reddit-reply.yaml
```
- The draft text is written to the Android clipboard.
- The target URL is opened in your default browser or app.
- A status notification is triggered.

### Step 2.4: Manual Actions
Review the destination app (Reddit/GitHub/etc.) on your device:
1. Paste the draft.
2. Edit for tone, relevance, and formatting.
3. Tap **Post** or discard.

### Step 2.5: Capture Outcome
Mark the result back in Termux:
```bash
gmh posted mh-2026-07-reddit-001 --notes "Modified intro to be warmer"
# or
gmh rejected mh-2026-07-reddit-001 --notes "Subreddit rules block links"
```
This logs the outcome in `result.json` which can be synced back.
