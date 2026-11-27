# Handoff: capability boundary + hostile-input fixtures (#7)

- **Issue:** gaia-research/gaia-operator#7 (P1 security)
- **PR:** gaia-research/gaia-operator#10 (draft), branch `fix/capability-boundary-hostile-fixtures-7`
- **Companion:** #8 adds the root `SECURITY.md` policy (founder-authored, open). This PR is the executable half; it does not duplicate `SECURITY.md`.
- **Date:** 2026-11-27

## What changed

Runtime enforcement of `untrusted content -> harness -> action -> policy gate -> adapter -> side effect`:

| Area | Before (main) | After |
|---|---|---|
| Action classification | Substring keywords; unknown verbs defaulted to **L0 allowed** | Closed token vocabulary; unknown token => denied; write verbs L4; write nouns L4 unless governed by a read/draft verb; private-message objects L5 |
| Constraint flags | Only `=== true` counted | Anything but an explicit negative counts (`"true"`, `"yes"`, `1`) |
| Risk upgrades | Any harness could record any level | `TraceRecorder` refuses L2+ above ceiling and any L5; refusals logged via `recordRefusal` |
| L4 approval | `REQUIRE_APPROVAL_FOR_L4=false` disabled it | Always required |
| Task ids / paths | Used raw in artifact, trace and sync paths | Safe-id schema + `resolveContained`; queue filename fallback ids sanitised and hash-suffixed |
| URLs | `includes("reddit.com")`; any scheme; no host checks | Parsed; http(s) only; non-public hosts refused (IPv4/IPv6 reserved ranges, NAT64, 6to4, internal suffixes); platform account routes refused |
| Browser | `page.goto` on anything | Pre-check, context-wide request + WebSocket routing to non-public hosts blocked, service workers blocked, landed URL re-checked before and after capture; refusals are `BlockedSessionError` |
| Reddit URLs | `https://www.reddit.com${permalink}`; browser fallback passed any host | Rebuilt from validated `/r/<sub>/comments/<id>` prefix only |
| Mobile handoff | Substring host check, checked once at prepare | Parsed host + account-route check; all guardrails re-run before the OS side effect |
| Artifacts | No redaction; raw markdown/CSV | Per-field redaction (linear-time), markdown/HTML/link neutralisation, CSV formula guard |
| Generic stop detection | None | Structural challenge / 429 interstitial detection; blocked redirects stop the run |

Contract doc: `docs/capability-boundary.md`. Tests: `tests/security/capability-boundary.test.ts`, fixtures in `tests/fixtures/hostile/` (all synthetic).

## Validation

- `pnpm build`: pass. `pnpm test`: **73 passed / 8 files** (baseline on main: 29).
- Mutation check: reverting each core fix file makes 1–3 security tests fail.
- Real Chromium 1243 (preinstalled) confirmed `route.abort("blockedbyclient")`, context-level popup blocking and `routeWebSocket` close (1008).
- Linear-time fuzz of redaction, `visibleText`, safe-text helpers and challenge detection on 15 adversarial shapes (40 KB each): all under 100 ms.
- `/code-review` (high) ran 10 rounds; every important finding was fixed with a regression test. Round 8 caught an exponential-backtracking regex introduced in round 5; it was replaced with a linear scanner.

## Known limits / residual risk

- No DNS resolution: a public name resolving to a private address (DNS rebinding) is not caught.
- Playwright routes only the first hop of a redirect chain; a redirected request to a private host is *sent* before the landed-URL check discards it.
- Keyword stop detection on Reddit is unchanged; generic detection is heuristic.
- Persona/soul reference paths are not contained (contents only used as a presence flag).
- Redaction recognises finite formats; screenshots are not redacted.
- The project's pinned Playwright (1.61.1) expects a browser build not present in this cloud image; real runs need `playwright install` or the matching executable. CI uses the simulated browser path.
- `PolicyEngine.checkAction` still has no runtime callers; enforcement on the live path comes from the trace guard, URL policy, adapter routing and harness structure.

## Decisions for the owner

- Merge order: #8 (policy) and #10 (enforcement) are independent; together they satisfy #7's acceptance list. Close #7 only after both merge.
- `REQUIRE_APPROVAL_FOR_L4=false` is now ignored. This matches the repository rule that public actions need per-action human approval; flag if any workflow relied on it.
