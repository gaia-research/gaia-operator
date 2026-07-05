# Agent Roles in Gaia Operator

Execution tasks are coordinated across specialized agents:

- **Operator Agent**: Primary runner (e.g. Hermes). Loads tasks, executes code, generates artifacts, and aborts on blocks.
- **Scout Coordinator**: Distributes queries to scouts, clusters, and dedupes findings.
- **Platform Scout**: Navigates specific subreddits or API streams to collect targets.
- **Policy Scout**: Inspects platform/subreddit moderation rules.
- **Evidence Scout**: Verifies quotes, URLs, and saves screenshots of target pages.
- **Reply Drafter**: Applies the Nova persona voice to generate replies.
- **QA Reviewer**: Ensures draft content is safe, compliant, and non-promotional.
- **Sync Agent**: Coordinates file-based task results syncing.
