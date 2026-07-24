# Converge: summary-freshness-recovery

## Qualitative scoring

| Alternative | Persona fit | JTBD fit | System fit | Blast radius | Notes |
| --- | --- | --- | --- | --- | --- |
| Centered Retry State | High | High | High | Low | Best first move; gives recovery without overexplaining. |
| Freshness Banner Above Summary | Medium | High | Medium | Medium | Promising later, but stale-current data is a trust risk. |
| Account Repair Path | Medium | Medium | Medium | Medium | Needs error classification before it can be honest. |
| Diagnostic Receipt | Low | Medium | Medium | Low | Useful for internal testing, not the user-facing answer. |

## Capability delta

Today, the user cannot:

- Tell what to do after current-month Summary cannot load.
- Trigger a visible refresh from the failed Summary state.
- Understand why prior months can appear while the current month is withheld.

After this release, the user can:

- Pull down to retry the current connected snapshot.
- Tap a direct retry action from the centered unavailable state.
- Read that current month waits for fresh account data while prior months may still show saved history.

Still intentionally not supported:

- Diagnosing the exact provider/backend failure in normal UI.
- Relinking accounts from Summary.
- Showing stale current-month charts as fresh.

## Reductive design decisions

- Enhance Summary instead of adding a support screen.
- Use native pull-to-refresh as the primary action.
- Keep one compact retry button for discoverability.
- Remove the card treatment because the whole current-month body is unavailable.
- Do not add account repair language until the app can classify account-specific failures.

## Activation path

The user encounters this only after current-month snapshot failure. No onboarding or tutorial is needed; the state itself teaches the action at the moment of need.

## Chosen alternative

Choose `Centered Retry State`.

This is the strongest fit for the true no-fallback case. When a last successful current-month snapshot exists, prefer a stale-while-refreshing variant: keep the charts visible, label freshness, and retry quietly.

## Bet

We're betting that retaining the last successful current-month snapshot with a freshness label will make transient refresh failures feel recoverable instead of alarming. If users still wonder whether visible data is fresh, revisit by adding a broader freshness banner or last-success receipt across Summary and budget detail.

## Success signal

Andrew rarely sees the full current-month failure state after a successful load; when refresh fails, Summary keeps showing the last known charts with a clear `couldn't refresh yet` footer.
