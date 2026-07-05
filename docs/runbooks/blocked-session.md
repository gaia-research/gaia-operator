# Runbook: Blocked Session Recovery

This runbook guides operators when the runtime encounters a login challenge, CAPTCHA wall, or rate limit.

## Diagnostic Steps
1. Verify if `blocked-state.md` exists in the task artifacts folder.
2. Read the description and evidence links (e.g. screenshot of the CAPTCHA).

## Recovery
- **If CAPTCHA**: Do not try to bypass. Run standard browser locally, complete the challenge, and store session cookies.
- **If Login challenge**: Verify that your credentials or API client information are configured correctly in the `.env` configuration.
- **If Rate Limit**: Wait for the rate budget to refresh. Enforce strict timing delays between queries.
