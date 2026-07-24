# Learning Release: summary-freshness-recovery

## Concept To Build

A stale-while-refreshing Summary state that keeps the last successful current-month snapshot visible, labels freshness, and only falls back to a centered unavailable state when there is no trustworthy current-month snapshot.

## Capability Delta

Today, the user cannot:

- Recover from the current-month unavailable state in place.
- Understand why prior months can load while current month cannot.

After this release, the user can:

- Retry the live connected snapshot from Summary.
- Keep using the last known current-month snapshot while Kwilt retries a failed refresh.
- Understand when current month is visible but not newly refreshed.

Still intentionally not supported:

- Provider-specific repair.
- Last-known stale chart mode.
- User-facing technical diagnostics.

## User Experience

On Summary, if the current-month connected snapshot has already loaded once, a later refresh failure keeps the visible charts in place and changes the footer to `couldn't refresh yet`. If there is no last successful current-month snapshot, the month body becomes a centered state rather than a card. Copy says to pull down to try again and clarifies that prior months may still show saved history while current month waits for fresh account data. A compact `Try again` action calls the same refresh path.

## Existing Product Relationship

This enhances Summary. It leaves Accounts, Transactions, Budget Detail, and Plaid connection flows unchanged.

## Buildable Slice

Must be real:

- Native pull-to-refresh on `KwiltPage`.
- Summary refresh handler that reruns the connected snapshot load.
- Preserve the last successful current-month snapshot after failed refresh.
- Footer freshness states for `refreshing` and `couldn't refresh yet`.
- Centered no-card error state.
- Retry action in the state.

Can be thin or temporary:

- Copy can stay generic until errors are classified.
- Loading state can reuse the same centered treatment.

Intentionally excluded:

- Account relink action.
- Persistent freshness receipt.
- Error-stage analytics.

## Release Channel

Local build first, then TestFlight if Summary verification passes. This is low-risk and reversible, but it affects a high-trust money surface.

## Brand-Goodwill Guardrails

- Never show stale current-month charts without labeling them.
- Do not blame the user for sync failure.
- Do not expose provider/backend jargon in the default state.

## Reversibility

The change is isolated to Summary and the shared page refresh prop. It can be removed by reverting the refresh-control prop and Summary state treatment.

## Permanent Product Threshold

Keep this as product behavior if self-use shows transient failures no longer interrupt Summary and the footer freshness language does not create new confusion about current vs prior-month freshness.
