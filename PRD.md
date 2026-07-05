PRD: Gaia Operator

Browser Interaction and Platform Community Interaction Runtime

Version: MVP PRD v0.1
Date: July 6, 2026
Recommended repo: "gaia-research/gaia-operator"
Related repo: "gaia-research/marketing-tasks"
Primary driver: Hermes Agent on MacBook
Possible secondary drivers: Pi harness, Codex, Claude Code, OpenClaw, other scout/subagent runners
Voice layer: Nova, supplied by "marketing-tasks" personas
Guardrail source of truth: Existing "marketing-tasks" guardrails

---

1. Executive Summary

"gaia-operator" is a reusable browser and platform interaction runtime for Gaia Research community workflows. It lets agents safely research platforms, inspect communities, draft interaction opportunities, collect evidence, and hand off approved actions back to the marketing task system.

The repo should not become a marketing strategy repo, campaign repo, persona repo, or Gaia Skill Tree integration. Its purpose is narrower and sharper:

«Give agents a safe, auditable way to interact with browser-based platforms and communities without becoming spammy, brittle, or blocked.»

The MVP should support a Hermes-first, API-first, browser-second, CUA-last execution model:

Task from marketing-tasks
  ↓
Gaia Operator
  ↓
Platform policy + guardrail check
  ↓
API / structured interface first
  ↓
Playwright or browser MCP if needed
  ↓
Hermes CUA fallback only when visual/native interaction is required
  ↓
Evidence artifact + recommendation
  ↓
Human approval before posting, messaging, or irreversible interaction
  ↓
Sync results back to marketing-tasks

The runtime must prioritize compliance over speed. Reddit’s current spam policy states that repeated or unsolicited mass engagement, whether automated or manual, is not allowed, and specifically calls out bots and generative AI tools when they facilitate spam. Reddit’s Data API Terms also prohibit exceeding API limits, bypassing restrictions, and using APIs to spam, incentivize, or harass users.

Therefore, the product principle is:

«Do not build an evasion harness. Build a respectful interaction harness.»

---

2. Background and Context

Marco currently has several moving parts:

pi-harness
  Universal orchestration, model selection, custom routing

gaia-research website
  Public brand, research surface, identity, documentation

marketing-tasks
  Private marketing queues, briefs, guardrails, personas, Soul.md, Nova voice, campaign artifacts

Hermes Agent
  Current execution driver

gaia-operator
  Proposed new repo for browser and community interaction

"marketing-tasks" already owns guardrails, personas, campaign intent, and queue management. "gaia-operator" should not duplicate those. It should consume them through explicit contracts.

The repo exists because generic browser harnesses already exist, but Gaia needs a vertical interaction runtime that knows how to:

1. Receive community interaction tasks.
2. Route work across APIs, Playwright, browser MCP, and Hermes CUA.
3. Respect platform and community constraints.
4. Produce evidence artifacts.
5. Ask for human approval before public interaction.
6. Sync learnings and status back to the marketing queue.

Playwright is the preferred browser automation layer because it supports Chromium, WebKit, and Firefox on macOS, Windows, and Linux, locally or in CI.  Playwright MCP is also relevant because it exposes browser automation through structured accessibility snapshots instead of relying only on screenshots, making it better for LLM-driven browser workflows.

Hermes CUA remains valuable, but it should be a fallback. Hermes CUA can drive desktop apps on macOS, Windows, and Linux, and on macOS it requires Accessibility and Screen Recording permissions. Hermes also provides "hermes computer-use doctor" as the first triage tool for diagnosing CUA setup issues.

---

3. Problem Statement

Agents performing platform and community tasks often fail in four ways:

3.1 They are too generic

A universal agent does not know the difference between:

reading a public Reddit thread
drafting a reply
posting a reply
mass posting across subreddits
DMing users
collecting leads
joining a Discord

These actions have very different risk levels.

3.2 They are too browser-centric

Browser automation is brittle. Platform UIs change, login prompts appear, modals interrupt flows, and stale DOM or accessibility snapshots cause wrong clicks.

3.3 They are too action-happy

Community platforms punish behavior that looks repetitive, unsolicited, or promotional. A naive agent may do “correct” actions technically while still violating community norms.

3.4 They lack evidence trails

Marketing agents need proof:

What was inspected?
What was found?
What was skipped?
What was blocked?
What needs human approval?
What source supports the recommendation?

Without artifacts, execution becomes fuzzy soup.

---

4. Product Vision

"gaia-operator" should become Gaia Research’s interaction layer:

A safe runtime for scouts and agents to observe, navigate, draft, verify, and report across web platforms.

It should feel like an airlock between agent intent and public action.

The system should make public interaction slower by design when risk is high, and fast when work is purely observational.

---

5. Goals

5.1 MVP Goals

The MVP must:

1. Create a new repo scaffold for "gaia-operator".
2. Support task intake from "marketing-tasks" through file-based contracts.
3. Implement a platform-agnostic interaction runtime.
4. Implement a Reddit-first community research harness.
5. Use API-first access where available and allowed.
6. Use Playwright or Playwright MCP for browser tasks.
7. Use Hermes CUA only as fallback for visual/native interaction.
8. Generate evidence artifacts:
   - Markdown report
   - JSON trace
   - Screenshots when browser/CUA is used
   - CSV or JSONL findings
   - Blocked-state report
9. Require human approval for:
   - posting
   - commenting
   - replying
   - messaging
   - joining communities
   - changing account settings
   - any action that creates visible public output
10. Sync status back to "marketing-tasks".

5.2 Long-Term Goals

Later versions may support:

1. More platforms:
   - Reddit
   - Hacker News
   - GitHub Discussions
   - Discord communities
   - X/Twitter
   - LinkedIn
   - YouTube comments
   - Product Hunt
   - Indie Hackers
2. Multi-agent scouting swarms.
3. Platform-specific playbook libraries.
4. Account health dashboards.
5. Interaction review queues.
6. Human-in-the-loop approval UI.
7. Reusable MCP server interface.
8. Browser session replay.
9. Cross-platform memory of community norms.
10. Campaign-level community maps.

---

6. Non-Goals

The MVP must not:

1. Touch Gaia Skill Tree.
2. Modify Gaia Skill Tree code, docs, data, or workflows.
3. Replace "marketing-tasks".
4. Store personas as source of truth.
5. Store final guardrails as source of truth.
6. Auto-post without human approval.
7. Auto-DM users.
8. Create accounts automatically.
9. Rotate accounts to bypass limits.
10. Use stealth browsers, CAPTCHA bypass, fingerprint spoofing, proxy rotation, or evasion techniques.
11. Scrape private content.
12. Collect personal data beyond what is necessary for the approved task.
13. Train models on platform user content.
14. Circumvent platform API limitations or rate limits.

The system should make bypass behavior impossible or at least loudly blocked.

---

7. Core Product Principle

Compliance-first Interaction

The system should never ask:

How do we avoid getting caught?

It should ask:

How do we operate in a way that does not deserve to be blocked?

This means:

1. Prefer official APIs.
2. Respect rate limits.
3. Respect community rules.
4. Avoid repetitive or unsolicited engagement.
5. Avoid mass messaging.
6. Keep actions explainable.
7. Stop at CAPTCHA, verification, login, or account challenge.
8. Ask humans before public writes.
9. Record evidence.
10. Fail closed.

---

8. Target Users

8.1 Marco

Owner, strategist, final approver. Wants high-leverage community interaction without operational chaos.

8.2 Hermes Operator Agent

Primary executor. Runs on MacBook. Drives browser and CUA tasks.

8.3 Pi Harness

Optional orchestrator for model selection, agent routing, and higher-level task planning.

8.4 Efficient Scouts

Lightweight research agents that fan out across platforms, collect findings, and return compact evidence.

8.5 Subagents

Specialized agents for policy checks, platform research, reply drafting, evidence validation, and task synchronization.

8.6 Marketing Agents

Agents in "marketing-tasks" that own campaign context, Nova voice, guardrails, and output review.

---

9. Operating Model

"gaia-operator" should act as the execution runtime below "marketing-tasks".

marketing-tasks
  owns:
    campaign briefs
    personas
    guardrails
    target platforms
    task queues
    approvals
    final outputs

gaia-operator
  owns:
    browser/API/CUA interaction
    session state
    platform adapters
    evidence capture
    block detection
    task execution traces
    safe action gates

9.1 Recommended Boundary

"marketing-tasks" says:

Find relevant Reddit discussions about AI agent browser automation.
Use Nova voice.
Do not promote directly.
Return opportunities and suggested replies.

"gaia-operator" does:

Inspect public sources.
Classify discussions.
Capture evidence.
Draft possible replies.
Mark risk.
Ask for approval before interaction.

---

10. MVP Scope

MVP Name

MVP-1: Reddit Research and Assisted Interaction Harness

MVP Outcome

Given a task from "marketing-tasks", "gaia-operator" can:

1. Load the task.
2. Load guardrail references.
3. Select Reddit platform harness.
4. Search public Reddit content through approved interfaces.
5. Open relevant threads when needed.
6. Summarize community needs and pain points.
7. Identify safe interaction opportunities.
8. Draft Nova-style replies without posting.
9. Produce evidence artifacts.
10. Return a status bundle to "marketing-tasks".

MVP Must Not Auto-Post

The MVP can prepare a reply, but must not publish it.

The MVP action levels are:

L0: Observe only
L1: Extract and summarize
L2: Draft private recommendation
L3: Prepare public reply for review
L4: Publish after explicit human approval

MVP should support L0 to L3 only by default.

L4 should exist only as a gated interface stub.

---

15. Risk Levels

Define all actions by risk level.

L0: Passive observation
  Read public pages, search public content, inspect public comments.

L1: Structured extraction
  Summarize, classify, score, save public links, create reports.

L2: Private drafting
  Draft replies, comments, posts, messages, but do not publish.

L3: Prepared interaction
  Fill a text box or prepare a post for review, but do not submit.

L4: Public write
  Submit post, comment, reply, reaction, vote, join, follow, message.

L5: Sensitive or prohibited
  Login changes, account creation, mass messaging, vote manipulation,
  CAPTCHA solving, evasion, proxy/fingerprint manipulation, scraping private data.

MVP Allowed Levels

Allowed by default:
  L0, L1, L2

Allowed only with explicit local approval:
  L3

Stubbed but disabled:
  L4

Always blocked:
  L5
