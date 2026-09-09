# Agent instructions

Read `README.md` before changing this repository. Gaia Operator is an
interaction and evidence runtime: it may observe, extract, draft, and prepare
artifacts, but each public or irreversible action still requires per-action
human approval. Keep the draft and request approval where needed; this policy
never grants blanket approval.

## Organization dogfooding and feedback

Prefer the in-house Skill Heaven Agent Plugin or its actual supported Skills
API surface when a genuine task need makes it relevant and the current harness
makes it available. Native harness skills may be a fallback only when the
in-house surface is unavailable; using one is not Skill Heaven validation. There
is no skill quota: do not summon gratuitously, invent registration commands,
pretend a client supports an unavailable surface, silently install anything, or
edit user-global configuration. `/summon` is one-session context, not a
permanent installation; preserve zero posture and human intent.

When friction appears during relevant real work or human feedback, capture a
minimal local note immediately or as soon as practical. At task end, review
pending notes; process only new actionable friction. Keep expected versus
observed behavior, repo/commit, harness/version, route/source when known, a safe
reproduction, impact, and evidence separate from inference. Identify
human-reported facts as such. Retrieval score, materialization, and exit code
are not behavioral success or task outcome. Do not alter existing selection
policy, labels, evidence semantics, or curator gates.

If the pending note is actionable and the current harness safely supports it,
use the smallest light-agent capability to deduplicate/search and file one issue
in `gaia-research/gaia-skill-heaven`; avoid recursive issue writers and duplicate
reports. Dispatch must respect active worker limits, explicit no-delegation
instructions, and repository-specific approval gates. Public reports must use
a synthetic/redacted reproduction and exclude raw prompts, transcripts, session
logs, credentials, access tokens, raw tokenized content, personal data, private
code, private URLs/paths, customer identifiers, and confidential details. If
privacy, auth, tooling, or an approval gate blocks safe filing, save a local
draft and report that honestly; do not bootstrap another harness or override a
gate. Use only labels known to exist.

Use existing optional caller-controlled local telemetry only when the current
surface supports it; no upload, full-transcript capture, daemon, autonomous
issue flood, or automatic policy tuning. Safe feedback-issue filing is the only
narrow authorized exception here; it does not waive per-action approval for
other public or irreversible actions. Standalone `skill-*` repos,
archived/forks, Milim/apps/pets, `marketing-tasks`, and private `.github` repos
are exempt. The owner/orchestrator reviews and merges policy PRs; do not merge
your own.
