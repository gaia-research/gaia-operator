# Agent instructions

Read `README.md` before changing this repository. Gaia Operator is an
interaction and evidence runtime: it may observe, extract, draft, and prepare
artifacts, but each public or irreversible action still requires per-action
human approval. Keep the draft and request approval where needed; this policy
never grants blanket approval.

## Organization dogfooding and feedback

Prefer the in-house Skill Heaven Agent Plugin or its actual supported Skills
API surface when a genuine task need makes it relevant and the current harness
makes it available. Native skills or the normal workflow may be a fallback when the in-house
surface is unavailable **or lacks a relevant usable skill**; fallback does not
count as Skill Heaven validation. This preference never overrides an explicit
user invocation or a repository-required project skill. There
is no skill quota: do not summon gratuitously, invent registration commands,
pretend a client supports an unavailable surface, silently install anything, or
edit user-global configuration. `/summon` is one-session context, not a
permanent installation; preserve zero posture and human intent.

When friction appears during relevant real work or human feedback, capture a
minimal local note immediately or as soon as practical. The exclusion list for
public reports applies to capture as well as output: do not record raw prompts,
transcripts, session logs, credentials, access tokens, raw tokenized content,
personal data, private code, private URLs or paths, customer identifiers, or
confidential details unnecessarily. Redact or synthesize before any external
search query or delegate handoff. Store minimal drafts outside repository
worktrees in caller-controlled local scratch. If uncertain, keep a constrained
local note and ask the owner; do not export it. At task end, review pending notes;
process only new actionable friction. Keep expected versus
observed behavior, repo/commit, harness/version, route/source when known, a safe
reproduction, impact, and evidence separate from inference. Identify
human-reported facts as such. Retrieval score, retrieval rank, materialization, and exit code
are not behavioral success or task outcome. Do not alter existing selection
policy, labels, evidence semantics, or curator gates.

Classify friction honestly as an unsupported client, unavailable configuration,
documented coverage limit, no-match, usability friction, or suspected defect.
Check the documented version and surface, and deduplicate known limits. Absence,
zero entries, or a no-match alone does not prove regression or intrinsic
uninstallability; known coverage limits are not by themselves defects. A new
actionable UX consequence may still be filed as feedback without asserting a bug.
Only observed Skill Heaven plugin, `/summon`, or existing `SKILL.md` Skills API
usability or capability friction belongs in this feedback loop. Repo-local tooling
issues follow existing repository filing rules; do not reroute Tree CLI preflight
issues into Skill Heaven.

If the pending note is actionable and in that Skill Heaven scope, use the
smallest light-agent capability that the current harness safely supports to
deduplicate/search and prepare one sanitized, approval-ready issue draft in
`gaia-research/gaia-skill-heaven`; do not publish it without per-action human
approval. The issue writer **MUST NOT** launch another issue writer or restart the
feedback loop. Deduplicate before publication using the already-sanitized
packet; process only one new actionable case, aggregate one underlying problem,
and link an existing issue when appropriate. Dispatch must respect active worker
limits, explicit no-delegation instructions, and repository-specific approval
gates. Public reports must use a synthetic minimal reproduction and exclude raw
prompts, transcripts, session logs, credentials, access tokens, raw tokenized
content, personal data, private code, private URLs or paths, customer
identifiers, and confidential details. This feedback procedure is not an
exception to per-action approval or any repository-mandated approval gate. If
privacy, auth, tooling, or an approval gate blocks safe preparation or filing,
save a local draft outside the repository worktree and report that honestly; do
not bootstrap another harness or override a gate. Use only labels known to exist.

Use existing optional caller-controlled local telemetry only when the current
surface supports it; no upload, full-transcript capture, daemon, autonomous
issue flood, or automatic policy, floor, gold, or tuning changes. If an aggregate cost or token figure is
included, it must come from canonical `gaia-research/skill-cost` with provenance,
not a UI or model self-report; otherwise omit it and do not collect extra data
for that purpose. Standalone `skill-*` repos,
archived/forks, Milim/apps/pets, `marketing-tasks`, and private `.github` repos
are exempt. The owner/orchestrator reviews and merges policy PRs; do not merge
your own.
