# Hostile-input fixtures

Synthetic, inert content used by `tests/security/capability-boundary.test.ts`.
Every value here is fabricated: no real accounts, URLs, credentials or tokens.
Token-shaped strings are built to match redaction patterns and are not valid
for any service.

Each fixture plays the role of untrusted platform content (a page, an API
response, a queue entry) that *asks* Gaia Operator to do something outside its
declared capability: bypass policy, read or reveal credentials, post publicly,
bypass a login/CAPTCHA, run destructive commands, or forge an approval. The
tests assert that the request produces no unauthorized side effect.

| File | Surface | Requests |
|---|---|---|
| `pages.json` | Generic browser observation | policy bypass, credential read, public post, CAPTCHA bypass, destructive shell, approval forgery |
| `reddit-search.json` | Reddit public JSON API | instruction injection in title/selftext, fence-breaking approval forgery, spreadsheet formula, host-spoofing permalink, token/email leakage |
| `queue/*.md` | marketing-tasks queue frontmatter | string-typed `auto_post`, L5 ceiling, path-traversal id, public-write `allow_post` |
