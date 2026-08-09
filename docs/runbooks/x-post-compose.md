# Runbook: X/Twitter Compose + Post via cua-driver

This runbook describes the verified end-to-end flow for posting to X/Twitter
from a `marketing-tasks` queue entry using `cua-driver` + Chrome accessibility
automation. It is validated for posts on `x.com` where the operator has already
pre-authenticated the target account in Chrome.

## Prerequisites

- Chrome is installed and running on macOS.
- The operator has pre-authenticated the target X account in the active Chrome profile.
- `cua-driver` is installed and available on PATH.
- `cua-driver permissions grant` has been completed; Accessibility and Screen Recording are granted.
- `cua-driver serve --grant existing-profile` has been started, or the daemon is already running with existing-profile authorization.

## Step 1: Start / Verify cua-driver Daemon

```bash
export PATH="$HOME/.local/bin:$PATH"
cua-driver status
```

If not running with the right grant, restart it:

```bash
cua-driver stop 2>/dev/null || true
cua-driver serve --grant existing-profile --permission-mode standard &
sleep 2
cua-driver status
```

## Step 2: Bind Chrome Window and Prepare Browser Target

Identify the Chrome PID and the target window ID:

```bash
export CHROME_PID=$(pgrep -f "Google Chrome" | head -1)
cua-driver call list_windows | python3 -c "import sys,json; [print(w['window_id'], w.get('title','')) for w in json.load(sys.stdin)['windows'] if w.get('app_name')=='Google Chrome' and w.get('is_on_screen')]"
```

Open the compose page and start a session:

```bash
osascript -e 'tell application "Google Chrome" to set URL of active tab of first window to "https://x.com/compose/post"'
sleep 2
export SESSION="x-post-$(date +%s)"
cua-driver call start_session "{\"session\": \"$SESSION\"}"
```

Bind the exact Chrome window and prepare the browser target:

```bash
export MAIN_WINDOW=<window_id_from_list_windows>
cua-driver call browser_prepare "{\"pid\": $CHROME_PID, \"strategy\": {\"kind\": \"existing_profile\"}, \"window_id\": $MAIN_WINDOW, \"session\": \"$SESSION\"}"
```

## Step 3: Enter Post Copy

Use clipboard paste for multiline content:

```bash
export POST_TEXT="<exact copy from queue task>"
cua-driver call clipboard_write "{\"text\": $(python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$POST_TEXT"), \"session\": \"$SESSION\"}"
```

Focus the compose textarea by clicking its screen coordinates, then paste:

```bash
cua-driver call click "{\"pid\": $CHROME_PID, \"x\": <textarea_x>, \"y\": <textarea_y>, \"session\": \"$SESSION\"}"
sleep 0.3
cua-driver call press_key "{\"pid\": $CHROME_PID, \"window_id\": $MAIN_WINDOW, \"session\": \"$SESSION\", \"key\": \"a\", \"modifiers\": [\"command\"]}"
sleep 0.2
cua-driver call press_key "{\"pid\": $CHROME_PID, \"window_id\": $MAIN_WINDOW, \"session\": \"$SESSION\", \"key\": \"v\", \"modifiers\": [\"command\"]}"
```

> **Note:** `type_text` with long multiline strings can return `type_text_incomplete`
> or fail to deliver newlines. Clipboard paste is the reliable path for body copy.

## Step 4: Submit the Post

Click the Post button by screen coordinates:

```bash
cua-driver call click "{\"pid\": $CHROME_PID, \"x\": <post_button_x>, \"y\": <post_button_y>, \"session\": \"$SESSION\"}"
```

Alternative keyboard shortcut when the textarea is focused:

```bash
cua-driver call press_key "{\"pid\": $CHROME_PID, \"window_id\": $MAIN_WINDOW, \"session\": \"$SESSION\", \"key\": \"Return\", \"modifiers\": [\"command\"]}"
```

## Step 5: Verify Posting

Confirm the compose textarea is cleared and the tweet text appears in the home/profile timeline:

```bash
cua-driver call get_window_state "{\"pid\": $CHROME_PID, \"window_id\": $MAIN_WINDOW, \"session\": \"$SESSION\", \"include_screenshot\": false}" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for el in d.get('elements', []):
    if 'SKILL.md' in (el.get('value') or ''):
        print('posted tweet found')
        break
"
```

Save proof:

```bash
cua-driver call get_window_state "{\"pid\": $CHROME_PID, \"window_id\": $MAIN_WINDOW, \"session\": \"$SESSION\", \"screenshot_out_file\": \"assets/media/proofs/YYYY-MM-DD-x-post-<task_id>.png\"}"
```

## Step 6: Record Result

Create a result card in `marketing-tasks/results/YYYY-MM-DD-<task_id>.md` with:
- Status: `posted`
- Proof screenshot path
- Verified tweet text fragment
- Execution notes (session id, input method)

## Known Limitations

- `browser_click` requires exact `target_id` + `tab_id` from `get_browser_state`.
  When the browser target is not yet bound, use desktop `click` by coordinates.
- `type_text` with `element_index` requires `snapshot_id` or `element_token` from
  a fresh `get_window_state` snapshot. Re-fetch the token after each navigation.
- Multiline `type_text` often delivers only the first line. Prefer clipboard paste.
- `browser_prepare` with `existing_profile` in `standard` mode requires the daemon
  to be launched with `--grant existing-profile`.

## Operator Safety

- Post **exactly** the copy provided in the queue task file. No rewrites.
- Never post from the wrong account. If the profile name/handle does not match
  the queue task's `account` field, abort immediately.
- Do not interact with DMs, analytics popups, or unrelated UI elements.
