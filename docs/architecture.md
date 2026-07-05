# Architecture Document: Gaia Operator

This document outlines the core architectural components of the `gaia-operator` interaction runtime.

## Core Flow Diagram

```
[ marketing-tasks Task File ]
             ↓
     [ Orchestrator ]
             ↓
    [ Policy Engine ]  ← Checks constraints & risk ceilings
             ↓
    [ Harness Router ]  ← Selects the platform harness
             ↓
   [ RedditResearchHarness ] (or other adapters)
    ├── API-first Access Mode (Reddit API)
    ├── Browser-second Access Mode (Playwright)
    └── CUA-last Fallback (Hermes CUA)
             ↓
[ Block Detector ]  ← Stops immediately on login / captcha walls
             ↓
[ Artifact Writer ]  ← Exports reports, jsonl, trace, drafts
             ↓
[ MarketingTasksAdapter ]  ← Syncs Results back
```

## Module Responsibilities

1. **CLI (`src/cli/`)**: User interface supporting commands to check environment, run tasks, validate schemas, or replay session traces.
2. **Core Engine (`src/core/`)**:
   - `orchestrator.ts`: Orchestrates execution.
   - `policy-engine.ts`: Checks against the policy rules.
   - `artifact-writer.ts`: Formats artifacts.
   - `trace-recorder.ts`: Records trace outputs.
   - `block-detector.ts`: Detects platform anti-automation blocks.
3. **Adapters (`src/adapters/`)**: Wraps browser automation libraries (Playwright), CUA tools (Hermes), and specific platform API layers.
4. **Harnesses (`src/harnesses/`)**: Implements platform playbooks, scoring models, recovery processes, and draft preparation.
