# Capability boundary

Gaia Operator sits between untrusted platform content and browser/API/OS
capabilities. This document is the executable half of the security contract:
what each risk level permits, where the runtime enforces it, and which tests
prove it. The policy statement lives in the root `SECURITY.md` (#8).

```text
untrusted content -> harness/model -> requested action -> policy gate -> adapter -> side effect
```

**Content can request an action. Content cannot authorize one.** Webpages,
API responses, thread titles, comments, tool output and queue-entry bodies are
data. Nothing they say raises a ceiling, enables public writes, skips an
approval or selects a stronger credential.

## Levels

| Level | Capability | Approval | Runtime rule |
|---|---|---|---|
| L0 | Passive observation of public pages (`read`, `navigate`, `search`, `inspect`, `screenshot`) | none | Only http(s) URLs without embedded credentials on public hosts; loopback/private/link-local/metadata hosts and private/inbox/settings paths refused. |
| L1 | Local extraction, scoring, reports | none | Read-only bookkeeping; recordable at any ceiling. |
| L2 | Private drafting | none | Must be within the task ceiling. |
| L3 | Prepared interaction (fill, prepare, handoff) | required by default (`REQUIRE_APPROVAL_FOR_L3`) | Must be within the task ceiling; platform defaults cap it further. |
| L4 | Public write (post, reply, comment, vote, like, follow, join, DM, delete, publish) | **always** per-action human approval | Denied while `ENABLE_PUBLIC_WRITE` is false (the MVP default). `REQUIRE_APPROVAL_FOR_L4=false` is ignored. |
| L5 | Prohibited (CAPTCHA solving, bypass, proxy/fingerprint, account creation, mass messaging, credential/session export, private scraping) | n/a | Always denied; never recordable as performed. |

## Fail-closed rules

| Rule | Enforced in |
|---|---|
| Action names are classified by whole `_`/`-` tokens. Write verbs (`submit`, `send`, `vote`, `delete`, …) are always L4; write nouns (`reply`, `post`, `comment`) are L4 unless drafted or read; `report_user`/`save_post` are platform writes. Input/execution verbs (`type`, `click`, `upload`, `execute`, …) and names no rule recognises are **denied**, not treated as L0. | `src/policies/action-risk.ts` (`classifyAction`, `isActionAllowed`) |
| Constraint flags are requests unless explicitly negative: `true`, `"true"`, `"yes"`, `1` all count. | `src/policies/constraint-intent.ts`, `src/core/policy-engine.ts` |
| A harness or adapter cannot record a step at L2+ above the task ceiling, or any L5 step. Adapters may narrow capability or stop; they may not upgrade it. A refused request is logged with `recordRefusal` and never counts as a public action. | `src/core/trace-recorder.ts` |
| L4/L5 always require approval, whatever the environment says. | `src/core/approval-gates.ts` |
| Task ids are a single safe path segment; artifact, trace and sync paths are re-checked at the filesystem boundary. | `src/core/task-loader.ts`, `src/core/state-store.ts` (`resolveContained`) |
| URLs are parsed, never substring-matched. Only http(s) to public literal hosts; platform targets must match the hostname exactly or as a dot-suffix. | `src/policies/url-policy.ts` |
| Reddit permalinks must be `/r/<sub>/comments/...` paths (no `%`, no dot segments) whose joined URL keeps the same host and normalised path. | `src/adapters/reddit/reddit-api-adapter.ts` |
| Mobile handoff re-validates the target URL immediately before opening it, not only at prepare time. | `src/harnesses/mobile-handoff/index.ts` |
| CAPTCHA, rate-limit and account-warning pages stop a generic observation run. Detection reads visible text plus explicit challenge-widget markup, not raw HTML, so script URLs and asset hashes do not stop a run. | `src/harnesses/generic-browser/index.ts` |
| A blocked adapter never authorises trying a more powerful one (Hermes CUA remains gated). | `src/adapters/computer-use/hermes-cua-adapter.ts` |

## Credentials and artifacts

- Credentials stay in the environment or the operator's own browser profile.
  Tasks and queue entries cannot name, select or reveal them.
- Every artifact written by `ArtifactWriter` is redacted: bearer/basic
  headers, GitHub/Slack/AWS/`sk-` keys, JWTs, private-key blocks, cookie
  headers, `*token*=`/`*secret*=`/`*password*=` pairs and email addresses.
  JSON keys that name a secret are blanked. Reddit excerpts are redacted before
  truncation so a cut-off secret cannot slip past the patterns.
- Untrusted single-line fields (titles, communities, URLs) are collapsed to
  one line in approval and draft cards, draft text is fenced with a fence
  longer than any backtick run inside it, and CSV cells are neutralised against
  spreadsheet formula injection. Content cannot forge a checked approval box.
- Redaction is defence in depth, not permission to publish an artifact unread.
  Screenshots are not redacted; review them before sharing.

## Tests

`tests/security/capability-boundary.test.ts` runs synthetic hostile fixtures
from `tests/fixtures/hostile/` (pages, a Reddit API response and queue entries)
that request policy bypass, credential access, public posting, CAPTCHA bypass,
destructive commands, approval forgery and path traversal, and asserts no
unauthorized side effect: zero public actions, no step above the ceiling, no
OS URL open, no out-of-tree write, no leaked secret, no forged approval.

## Known limits

- Stop-condition detection is keyword based. For generic observation the
  "login" keyword is not a stop (almost every public page links to sign-in);
  the harness never submits credentials. Visible words such as "suspended" or
  "banned" can still stop a run on an unrelated page; that errs toward stopping.
- Host checks are literal: no DNS resolution, so a public name that resolves to
  a private address (DNS rebinding) is not caught here.
- Persona/soul reference files are resolved relative to the task and
  marketing-tasks paths without containment; their contents are only used as a
  presence flag and are never written to artifacts.
- Redaction recognises finite formats and is not a secret scanner.
- Private vulnerability reporting: see the root `SECURITY.md` (#8).
