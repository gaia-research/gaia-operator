# Capability boundary

Gaia Operator sits between untrusted platform content and browser/API/OS
capabilities. This document is the executable half of the security contract:
what each risk level permits, where the runtime enforces it, and which tests
prove it. The policy statement is the root `SECURITY.md` proposed in #8 (not yet merged).

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
| L0 | Passive observation of public pages (`read`, `navigate`, `search`, `inspect`, `screenshot`) | none | Only http(s) URLs without embedded credentials on public hosts; loopback/private/link-local/metadata hosts and per-platform account routes (Reddit `/message`, `/settings`, `/account`; GitHub `/settings`, `/notifications`; LinkedIn `/messaging`; Discord `/channels/@me`; …) refused. |
| L1 | Local extraction, scoring, reports | none | Read-only bookkeeping; recordable at any ceiling. |
| L2 | Private drafting | none | Must be within the task ceiling. |
| L3 | Prepared interaction (fill, prepare, handoff) | required by default (`REQUIRE_APPROVAL_FOR_L3`) | Must be within the task ceiling; platform defaults cap it further. |
| L4 | Public write (post, reply, comment, vote, like, follow, join, DM, delete, publish) | **always** per-action human approval | Denied while `ENABLE_PUBLIC_WRITE` is false (the MVP default). `REQUIRE_APPROVAL_FOR_L4=false` is ignored. |
| L5 | Prohibited (CAPTCHA solving, bypass, proxy/fingerprint, account creation, mass messaging, credential/session export, private scraping) | n/a | Always denied; never recordable as performed. |

## Fail-closed rules

| Rule | Enforced in |
|---|---|
| Action names are split into whole `_`/`-` tokens and checked against a **closed vocabulary**: any unknown token (`retweet`, `connect`, `click`, `approve`, `autopost`, …) makes the action unrecognised, and unrecognised actions are **denied**; a known read verb elsewhere in the name cannot launder it. Write verbs (`submit`, `send`, `vote`, `delete`, …) are always L4. Write nouns (`reply`, `post`, `comment`) are L4 unless a read/draft/prepare verb governs them with only plain object nouns between (`draft_reply` is L2, `read_thread_comments` L0; `post_draft`, `read_to_reply`, `search_post_reply`, `extract_post_comments` are L4, fail closed). `report`/`save`/`block` with a platform object (either order) is a platform write. Any action on private messages, inboxes, DMs or chats is L5 unless the whole name is an explicit send (`send_message`, L4). | `src/policies/action-risk.ts` (`classifyAction`, `isActionAllowed`) |
| Constraint flags are requests unless explicitly negative: `true`, `"true"`, `"yes"`, `1` all count. | `src/policies/constraint-intent.ts`, `src/core/policy-engine.ts` |
| A harness or adapter cannot record a step at L2+ above the task ceiling, or any L5 step. Adapters may narrow capability or stop; they may not upgrade it. A refused request is logged with `recordRefusal` and never counts as a public action. | `src/core/trace-recorder.ts` |
| L4/L5 always require approval, whatever the environment says. | `src/core/approval-gates.ts` |
| Task ids are a single safe path segment (an explicit unsafe id is rejected; a filename-derived fallback id is sanitised); artifact, trace and sync paths are re-checked at the filesystem boundary. | `src/core/task-loader.ts`, `src/core/state-store.ts` (`resolveContained`) |
| URLs are parsed, never substring-matched. Only http(s) to public hosts: loopback, RFC 1918, CGNAT, link-local/metadata, benchmarking and documentation ranges, IPv6 ULA/link-local/site-local/multicast, IPv4-mapped/-compatible and NAT64 forms of those, single-label names and `.local`/`.internal`/`.svc`/`.corp`-style suffixes are refused. Platform targets must match the hostname exactly or as a dot-suffix. | `src/policies/url-policy.ts` |
| Reddit thread URLs are rebuilt from a validated `/r/<sub>/comments/<id>` prefix only; the slug, query and any `%2e%2e`/dot segments are discarded, and anything without that prefix is dropped. Browser-fallback URLs must also be https on reddit.com. | `src/adapters/reddit/reddit-api-adapter.ts`, `reddit-browser-adapter.ts` |
| Mobile handoff targets must be public threads (never DM compose, inbox or settings pages); every guardrail (target URL, platform, constraints, draft) is re-run on the current task file immediately before opening the URL, not only at prepare time. | `src/harnesses/mobile-handoff/index.ts` |
| The browser adapter refuses a non-public URL before navigating; aborts requests and WebSockets to non-public hosts from every page in the context (popups included) and blocks service workers; and discards a page that redirected to a non-public host or a platform account path, checking both before and after capture; a move to another origin during capture also discards it (no content, title or screenshot kept). These refusals are blocked states (a login/account redirect reports `login`), so the run stops with human guidance instead of failing. | `src/adapters/browser/playwright-adapter.ts` |
| A CAPTCHA/human-verification or 429 interstitial stops a generic observation run, as does a navigation refused as a blocked redirect. Strong signals hold at any length (Cloudflare challenge-orchestrator or challenge-form markup, or a title that *is* an interstitial title such as "Attention Required! \| Cloudflare" or "429 Too Many Requests"); weak signals (widgets, phrases in body text) count only on a near-empty page, so articles and forms that mention or embed them do not stop it. Reddit runs keep the existing stop conditions. | `src/harnesses/generic-browser/index.ts` |
| A blocked adapter never authorises trying a more powerful one (Hermes CUA remains gated). | `src/adapters/computer-use/hermes-cua-adapter.ts` |

## Credentials and artifacts

- Credentials stay in the environment or the operator's own browser profile.
  Tasks and queue entries cannot name, select or reveal them.
- Every artifact written by `ArtifactWriter` is redacted: Authorization and
  cookie headers, `user:pass@` URL credentials, token-shaped Bearer/Basic values, GitHub/Slack/AWS/`sk-`
  keys, JWTs, private-key blocks, credential-named pairs (`accessToken=`,
  `client_secret:`, `?key=`, quoted/JSON forms) and email addresses. JSON keys
  whose name ends in a credential word are blanked whatever the value's type. Untrusted fields are redacted one at a time before they are
  formatted, so a pattern cannot consume neighbouring CSV cells or approval
  lines; separators are matched within a line, so a field ending in "token:"
  cannot swallow the next line. Reddit excerpts are redacted before truncation.
- Untrusted single-line fields (titles, communities, URLs) are collapsed to
  one line in approval cards, draft cards and `report.md`. Draft text is
  fenced with a fence longer than any backtick run inside it, excerpts are
  blockquoted line by line, `\`, `<`, `[` and `]` are escaped (no HTML comments,
  tags, links or remote images that hide content or load on preview), and CSV cells are neutralised against spreadsheet
  formula injection. Content cannot forge a checked approval box.
- Redaction and visible-text extraction run in linear time on hostile input
  (private-key blocks and tags are scanned, not backtracked; other patterns
  have bounded quantifiers).
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

- Reddit stop-condition detection is unchanged and keyword based. Generic
  observation does not stop on login links or account-warning words: it never
  signs in or submits anything, so those pages are observed, not acted on.
- Host checks are literal: no DNS resolution, so a public name that resolves to
  a private address (DNS rebinding) is not caught here.
- Playwright routes only the first request of a redirect chain. A public URL
  that redirects to a private host is refused after landing (nothing is kept),
  but the redirected request itself has already been sent.
- JSON keys whose name ends in a credential word are blanked; free text such
  as "the token: abc" is also redacted, which can over-redact prose.
- Persona/soul reference files are resolved relative to the task and
  marketing-tasks paths without containment; their contents are only used as a
  presence flag and are never written to artifacts.
- Redaction recognises finite formats and is not a secret scanner.
- Private vulnerability reporting: see the root `SECURITY.md` proposed in #8.
  Until it merges, follow the organisation policy in
  `gaia-research/gaia-security` `SECURITY.md` (interim private intake via the
  Skill Tree private advisory channel). Never open a public issue with exploit
  details.
