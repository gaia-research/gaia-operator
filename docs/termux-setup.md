# Termux Environment Setup Guide

To run Gaia Mobile Handoff, you need Termux and the Termux:API add-on installed on your Android device.

---

## 1. System Requirements & App Installation

1. **Termux (Terminal Emulator)**:
   - Install Termux from F-Droid (do not use Google Play Store, as it is deprecated).
2. **Termux:API (Android Add-on)**:
   - Install the **Termux:API** application from F-Droid.
   - **Important**: Both applications must be installed from the same source (F-Droid) to ensure they share the same signing keys, which Android requires to grant inter-process permissions.

---

## 2. Command Line Package Installation

Open Termux and run the following setup commands:

```bash
# Update package repositories
pkg update && pkg upgrade -y

# Install Node.js, git, jq, and termux-api CLI bridge
pkg install nodejs git jq termux-api -y
```

---

## 3. Verifying the Setup

To verify that the Termux:API package is correctly communicating with your Android system, run:

```bash
# Get device details
termux-info

# Test clipboard interaction
termux-clipboard-set "Hello from Gaia!"
termux-clipboard-get

# Test notification trigger
termux-notification --title "Setup Test" --content "Gaia Operator Mobile Handoff is ready."
```

If these execute successfully and you receive a notification, your environment is ready to run the Mobile Handoff runner.
