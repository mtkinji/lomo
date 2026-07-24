# Evaluate Learning: summary-freshness-recovery

## Learning questions

- Does the centered state feel like a calm unavailable state rather than an error card?
- Does `Pull down to try again` answer "what do I do now?"
- Does keeping the last successful current-month snapshot visible prevent unnecessary alarm?
- Is `couldn't refresh yet` clear enough without feeling like a serious account problem?
- Does the prior-month explanation reduce confusion, or does it raise more doubt about freshness?
- Is a retry button still needed once pull-to-refresh exists?
- Do users need a last-success timestamp on the unavailable state?

## Evidence plan

Supporting evidence:

- Andrew can reproduce the unavailable state and immediately retry from Summary.
- After at least one successful current-month load, a later refresh failure keeps charts visible.
- The state makes clear that current-month charts are hidden to protect freshness.
- No feedback asks "is the rest of this stale?" after reading the state.

Disconfirming evidence:

- Users still navigate to Accounts without knowing why.
- Users miss the stale footer and assume refresh succeeded.
- Users assume prior months are live/current because the current month failed.
- Users want the exact failure reason more than a retry.

## Instrumentation

For this learning slice, manual self-use notes are enough.

Future instrumentation, if needed:

- `summary_snapshot_refresh_started`
- `summary_snapshot_refresh_succeeded`
- `summary_snapshot_refresh_failed`
- `summary_snapshot_retry_pressed`

Do not track transaction-level details for this question.

## Decision rule

After local simulator verification and at least one real self-use failure or forced failure rehearsal:

- Proceed if the state feels recoverable and avoids stale-data doubt.
- Revise if the copy still makes prior/current freshness ambiguous.
- Expand only if the next observed failure is account-specific enough to justify an Accounts repair path.

## Expected next action

Verify the UI in simulator and, separately, capture/log the underlying snapshot error so the engineering cause can be fixed without making the normal UI technical.
