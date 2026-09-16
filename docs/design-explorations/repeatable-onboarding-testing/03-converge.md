# Converge: Repeatable Onboarding Testing

## Chosen alternative

Choose **scoped onboarding-artifact replay**, paired with a documented clean-install/new-identity baseline.

## Capability delta

Today Andrew can reopen first-time UX, but the control neither cleans its prior output nor explains the evidence boundary. After this change, one development-only action removes the last known onboarding-created object graph, resets onboarding-only answers and guides, and reopens the flow while explicitly preserving the account and unrelated data.

Still intentionally unsupported: treating the replay as first-install proof, erasing arbitrary cloud data, or recreating a provisioned email identity from the client. A dedicated ordinary test identity may be reused: in development builds, its server-controlled marker suppresses the age fallback only when no synced Arc, Goal, or Activity exists.

## Reductive decisions

- Enhance the existing **First-time UX** DevTools card.
- Use one primary action, not a persistent toggle.
- Show one concise scope statement.
- Confirm only when known onboarding-created objects will be removed.
- Reuse existing `Button`, `Text`, card, Alert, and store removal behavior.

## Activation

Andrew invokes the action when iterating inside a development build. No customer education, notification, or production surface is added.

## Bet

We're betting that most onboarding iteration needs a scoped replay, while occasional clean-install runs with the dedicated empty test identity provide the higher-fidelity baseline. If retained account state still obscures common testing, revisit with an operator-side reset command rather than a privileged client reset.

## Success signal

Repeated use produces one new onboarding-created Arc graph at a time, preserves unrelated data, and the UI makes the proof boundary obvious.
