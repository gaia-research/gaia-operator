# Hermes Setup Guide

Hermes acts as the execution driver on macOS/MacBook environments.

## CUA Setup
1. Ensure Hermes CLI is installed in your system PATH.
2. Grant Accessibility and Screen Recording permissions to your terminal/Hermes agent.
3. Run `hermes computer-use install` to install driver dependencies.
4. Run `hermes computer-use status` to verify permissions.

## Setup Triage
If native actions or screen captures fail, use the CUA doctor command to diagnose setup issues:
```bash
hermes computer-use doctor
```
This is the fastest triage step for checking active permissions.
