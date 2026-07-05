# Gaia Operator

Gaia Operator is the browser and platform interaction runtime for Gaia Research agents.

It helps agents safely research communities, inspect platform context, draft useful replies, collect evidence, and hand off approval-ready outputs to marketing workflows.

It is not a spam bot.  
It is not an evasion harness.  
It is not the marketing brain.  

It is the interaction layer between agent intent and public platforms.

---

## Operating Model

```
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
```

## Features

- **CLI Tooling**: Load, validate, run, and replay tasks.
- **Safety Policy Engine**: Enforces risk ceilings (L0-L5) and halts execution on CAPTCHA/login walls.
- **Adaptive Execution**: API-first searches with seamless fallback to automated browser browsing when needed.
- **Nova Voice Drafting**: Generates helpful, low-ego, non-promotional responses to community issues.
- **Complete Evidence Logs**: Emits trace steps, jsonl findings, csv opportunities, draft markdowns, and screenshots.

---

## Installation

Ensure you have Node.js (>= 18) and `pnpm` installed.

```bash
# Clone the repository
git clone https://github.com/gaia-research/gaia-operator.git
cd gaia-operator

# Install dependencies
pnpm install
```

---

## CLI Usage

Run environmental diagnostics:
```bash
pnpm operator doctor
```

Validate task file schema:
```bash
pnpm operator validate-task templates/task.reddit-research.yaml
```

Run task:
```bash
pnpm operator run-task templates/task.reddit-research.yaml
```

Replay trace step-by-step:
```bash
pnpm operator replay-trace .gaia-operator/artifacts/mt-2026-07-reddit-browser-agents-001/trace.json
```

Export report markdown:
```bash
pnpm operator export-report .gaia-operator/artifacts/mt-2026-07-reddit-browser-agents-001/ extracted_report.md
```

List registered harnesses & platforms:
```bash
pnpm operator list-harnesses
pnpm operator list-platforms
```

---

## Safety Guidelines (Fail-Closed)

The runtime prioritizes platform compliance and terms of service integrity. Evasion methods (like proxy rotations, fingerprint spoofing, or captcha auto-solving) are strictly disabled. When a roadblock (like CAPTCHA or Login Challenge) is detected, the run finishes immediately and writes a `blocked-state.md` report requiring human intervention.
