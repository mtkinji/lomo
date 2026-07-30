# Learning Release: Family Screen Time Direct Controls

## Concept To Build

An authorized caregiver can use Chat to block or allow a saved app selection for one or more children until an exact time, then see truthful per-device application and expiry.

## Capability Delta

Today, the caregiver cannot:

- issue a direct time-bounded multi-child block or allow;
- reuse a plain-language app label across Chat commands; or
- distinguish batch save from each device’s application and expiry.

After this release, the caregiver can:

- save one named selection per child through Apple’s picker;
- ask Chat to block or allow it for a bounded wall-clock duration;
- review one exact proposal before applying;
- inspect or cancel the active directive; and
- see saved, applying, applied, expired, and failed truth.

Still intentionally unsupported:

- arbitrary app discovery, remote uninstall, permanent disable, usage surveillance, unbounded overrides, and foreground-usage budgets.

## User Experience

Chat is the primary path. Missing selection setup hands off to the exact child’s native Screen Time route and returns to the same Chat request. Household child Screen Time lists the active directive only while it is relevant and provides **End block**.

## Existing Product Relationship

This extends the accepted Screen Time control plane. It does not replace standing agreements, child exceptions, or the Settings overview.

## Buildable Slice

Must be real:

- child-scoped saved selection references;
- bounded block/allow overrides with server-computed expiry and idempotent batch operation;
- caregiver authority and capability activation checks for every child;
- typed Chat proposal and explicit confirmation;
- desired policy versions and per-device receipts;
- automatic local expiry that recompiles remaining restrictions.

Can be thin:

- one app/group label per child;
- wall-clock durations expressed as minutes or an exact timestamp;
- one local/TestFlight family during learning.

## Release Channel

Local source and Simulator for proposal/setup flow, then TestFlight for actual Family Controls selection, two-child delivery, offline expiry, and restoration.

## Brand-Goodwill Guardrails

- Never claim to know an app that was not explicitly selected.
- Never partially apply a batch without an explicit caregiver choice.
- Never say **Applied** from a saved server row or sent push.
- Never imply a family **allow** removed an independent Focus, Money, personal, or Apple restriction.
- Always show the exact local expiry.

## Reversibility

Overrides expire automatically, may be cancelled explicitly, and live in additive tables. Disabling the feature must not delete standing agreements or selection records.

## Permanent Product Threshold

The workflow becomes product-ready only after signed devices prove selection reuse, two-child delivery, missed-push reconciliation, offline expiry, cancellation, and restoration without clearing stricter policies.
