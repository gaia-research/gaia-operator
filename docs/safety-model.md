# Safety and Compliance Model

Compliance-first interaction is the core product principle of Gaia Operator.

## Action Risk Levels
- **L0: Observe only**: Read public pages without session cookies/credentials.
- **L1: Extract & Summarize**: Process pages into findings.
- **L2: Private Drafting**: Generate Nova voice drafts locally.
- **L3: Prepared Interaction**: Prepare page state for a human reviewer (e.g. fill inputs).
- **L4: Public Write**: Submit post/reply/messages (Gated/Disabled in MVP).
- **L5: Prohibited**: CAPTCHA bypass, evasion, proxy/fingerprint rotation.

## Evasion vs Respect Policy
We do not build evasion tools. If challenged by a CAPTCHA, login challenge, or 2FA, the system fails closed immediately and produces a `blocked-state.md` report.
The system uses official APIs where available and allowed.
Rate budgets are enforced per platform.
