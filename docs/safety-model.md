# Safety and Compliance Model

Compliance-first interaction is the core product principle of Gaia Operator.

## Action Risk Levels
- **L0: Observe only**: Read public pages without session cookies/credentials.
- **L1: Extract & Summarize**: Process pages into findings.
- **L2: Private Drafting**: Generate Nova voice drafts locally.
- **L3: Prepared Interaction**: Prepare page state for a human reviewer (e.g. fill inputs).
- **L4: Public Write**: Submit post/reply/messages (Gated/Disabled in MVP).
- **L5: Prohibited**: CAPTCHA bypass, evasion, proxy/fingerprint rotation.

## Boundary for separate interactive marketing publication

The L4 prohibition applies to Gaia Operator runs, its harnesses, adapters,
queue-derived tasks and mobile handoffs: a human must perform the final public
submission for those workflows. Operator approval does not enable an agent to
submit on their behalf, and an external browser must not be used to evade this
restriction or execute an Operator task's prohibited action.

Separately, an operator may authorize a marketing-tasks `/auto` interactive
session to publish an independently reviewed marketing campaign using the
operator's authenticated ego-browser session. This is a distinct workflow,
not a Gaia Operator run or an adapter for its L4 task, and it grants neither
unattended execution nor permission to bypass platform restrictions. The
marketing control plane owns and must enforce explicit per-publication human
authorization bound to the exact reviewed campaign, copy, media, target and
account; independent editorial review; live account and duplicate checks;
durable intent before submission; media verification; and publication receipts.
The authoritative implementation contract is `marketing-tasks/docs/autonomous-marketing.md`.
Interactive means an operator-directed live session, not a scheduled runner.
Stop if the contract or authorization is unavailable, content changes, login
challenges or MFA appear, the actor is wrong, the provider restricts action, or
the outcome is uncertain. Never automatically retry an ambiguous submission;
reconcile it using verified live evidence. Private messages and other prohibited
actions are not authorized by this decision.

The policy engine has an `ENABLE_PUBLIC_WRITE` configuration path for future
use; it is not itself an unconditional L4 deny when enabled. The current MVP
publish stub remains disabled and this decision does not enable that flag.

## Evasion vs Respect Policy
We do not build evasion tools. If challenged by a CAPTCHA, login challenge, or 2FA, the system fails closed immediately and produces a `blocked-state.md` report.
The system uses official APIs where available and allowed.
Rate budgets are enforced per platform.
