# Diverge: summary-freshness-recovery

Axis of variation: recovery action vs freshness explanation vs diagnostic escalation.

## Alternative 1: Centered Retry State

Replace the card with a centered unavailable state, explain that current month waits for a fresh account snapshot, and provide pull-to-refresh plus a retry button.

Audience fit: high. It answers "what do I do now?" without turning Maya into an operator.

System fit: high. Reuses Summary, existing snapshot load, and native refresh.

Best when: the failure is transient or the user just needs a clear next action.

Fails when: the underlying issue requires account relinking or backend repair.

Anti-pattern check: avoids dashboard and provider jargon.

## Alternative 2: Freshness Banner Above Summary

Keep stale last-known charts visible, but add a banner that says the current month could not refresh and the charts are from the last successful sync.

Audience fit: medium. It preserves useful context but requires careful trust language.

System fit: medium. Requires retaining last-known snapshots and labeling them.

Best when: stale-but-labeled data is better than no current-month view.

Fails when: the user treats old data as current spending truth.

Anti-pattern check: risks turning Summary into a status dashboard.

## Alternative 3: Account Repair Path

When refresh fails, show "Check account connection" and route to Accounts for relink/sync status.

Audience fit: medium. Useful for durable account failures, too heavy for transient reads.

System fit: medium. Accounts already exists, but the app needs error classification to know when this is appropriate.

Best when: tokens are expired, permissions changed, or sync is blocked.

Fails when: backend/schema/network failures send the user to the wrong place.

Anti-pattern check: risks blaming the user for system failures.

## Alternative 4: Diagnostic Receipt

Add an internal-only details drawer that shows the failed read stage for Andrew/TestFlight builds.

Audience fit: low for Maya, high for Andrew as tester.

System fit: medium. Requires error-stage capture.

Best when: developing the live data path.

Fails when: exposed as normal product language.

Anti-pattern check: finance admin/debug voice if promoted too broadly.
