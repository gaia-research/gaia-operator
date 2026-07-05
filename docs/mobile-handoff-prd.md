# Gaia Operator Mobile Handoff PRD

## Termux + Pi Hybrid for Human-in-the-Loop Platform Interaction

**Version**: v0.1 MVP PRD
**Date**: July 6, 2026
**Scope**: Option B only, Termux + Termux:API + Android intents + human final action
**Primary environment**: Android phone running Termux and Pi harness
**Primary role**: Mobile-assisted platform/community interaction
**Explicitly deferred**: ADB control, Android Accessibility control, Appium, companion app, full Android CUA
**Voice layer**: Nova, supplied by existing persona files
**Guardrails**: Existing marketing-tasks guardrails remain source of truth

---

## 1. Executive Summary
Gaia Operator Mobile Handoff is a mobile interaction layer for agents running inside Termux. It lets Pi or other local agents prepare community interactions, copy drafts to clipboard, open exact platform URLs, raise approval notifications, and write artifacts, while requiring the human to perform the final action manually.

The product principle:
> **The agent may prepare, route, remind, and document. The human taps publish.**

This keeps mobile execution useful today without waiting for Android CUA, ADB reliability, Accessibility services, or app-specific automation.

---

## 2. Operating Model & Core Principles
This is the "knife in a sheath" version of mobile automation. Sharp, but not flailing around in your pocket.

- **Prepare, Don't Press**:
  - Allowed: Open URL, copy draft, create notification, write markdown cards, share payload, log artifacts, capture status.
  - Blocked: Tap submit, send message, post comment, upvote/like, join group/follow.
- **Allowed Risk**:
  - Max risk level: L3
  - Agent public actions: always false
  - Human final action: always required

---

## 3. Input & Output Contract

### Input Task Schema (`task.yaml`)
- `id`: Unique identifier (e.g. `mh-2026-07-reddit-001`)
- `type`: `mobile_handoff`
- `platform`: `reddit`, `github`, `discord`, `linkedin`, `x`, or `generic`
- `target`: `url`, optional `community` and `context_summary`
- `voice`: optional references to persona and soul configuration
- `constraints`: `auto_post` (false), `auto_dm` (false), `require_manual_publish` (true)

### Output Result (`result.json`)
Before completion:
```json
{
  "task_id": "mh-2026-07-reddit-001",
  "status": "handoff_ready",
  "platform": "reddit",
  "target_url": "https://www.reddit.com/r/example/comments/...",
  "draft_path": "artifacts/mobile-handoff/mh-2026-07-reddit-001/draft.txt",
  "clipboard_written": true,
  "url_opened": true,
  "notification_sent": true,
  "public_action_taken_by_agent": false,
  "manual_action_required": true
}
```

After user result capture:
```json
{
  "task_id": "mh-2026-07-reddit-001",
  "manual_result": "posted_with_edits",
  "posted_by": "human",
  "agent_public_action": false,
  "notes": "Edited first sentence to be less promotional.",
  "timestamp": "2026-07-06T03:30:00+08:00"
}
```
