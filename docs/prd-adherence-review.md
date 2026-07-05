# PRD Adherence Review

## Result

The initial repo had the correct skeleton, but it was too optimistic in several places. This hardening pass moves the MVP closer to the PRD's intended behavior: API-first, browser-second, CUA-last, evidence-first, and fail-closed.

## Key Fixes

- Removed silent Reddit mock-data fallback from the API adapter.
- Made browser simulation explicit through `GAIA_OPERATOR_ALLOW_SIMULATION=true` or test mode.
- Replaced fake Hermes CUA success with a gated adapter response.
- Strengthened policy validation so L4 task ceilings are rejected while `ENABLE_PUBLIC_WRITE=false`.
- Added hard blocking for automation constraints such as auto-DM, auto-vote, proxy rotation, CAPTCHA bypass, account creation, and mass reply flows.
- Removed self-promotional Gaia wording from Reddit draft replies.
- Stopped claiming subreddit rules were verified when the runtime did not actually verify them.
- Added stronger approval request checklists.
- Added evidence references to findings.
- Made reports explicit that public actions taken must remain zero in the MVP.

## Remaining Gaps for Agents

- Implement real subreddit rule inspection and store rule evidence before any L3 approval request.
- Add official OAuth Reddit adapter if the project needs authenticated API access.
- Add Playwright MCP adapter implementation instead of a stub.
- Add trace replay assertions for blocked sessions.
- Add marketing-tasks issue/comment sync once agents can see the private repo.
- Add platform-specific fixtures for Hacker News, GitHub Discussions, LinkedIn, X, Discord, and YouTube.

## Non-Negotiables

- No auto-posting in MVP.
- No auto-DM.
- No account creation.
- No CAPTCHA solving or bypass.
- No proxy rotation or fingerprint spoofing.
- No fake live evidence from simulated data.
- Stop on login, 2FA, CAPTCHA, rate limit, account warning, or unclear community rules.
