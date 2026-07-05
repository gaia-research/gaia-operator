# Runbook: Human Approval

This runbook describes the workflow for approving assisted interaction drafts.

## Step 1: Locate Request
Open `approval-request.md` in the task artifacts folder.

## Step 2: Validate Compliance
Evaluate the draft text against the guardrails checklist:
- Does the reply add direct technical value?
- Is there any unsolicited product placement?
- Is it free from templated AI speech patterns?

## Step 3: Action Execution
- **If Approved**: Manually copy the reply and paste it into the thread, or approve it for automated execution if L4 write is supported in later versions.
- **If Rejected**: Mark as skipped and update the completed queue in `marketing-tasks`.
