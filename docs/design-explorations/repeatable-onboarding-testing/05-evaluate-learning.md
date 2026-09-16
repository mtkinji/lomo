# Evaluate Learning: Repeatable Onboarding Testing

## Learning questions

- Does scoped replay cover the ordinary onboarding iteration loop?
- Is the distinction from clean-install/new-identity testing immediately understandable?
- Are previous onboarding-created objects absent after replay while unrelated objects remain?

## Evidence

- Focused store tests for exact cleanup and preservation.
- iPhone 17 Pro Simulator observation of the real DevTools route, confirmation, onboarding restart, and second replay.
- A separately recorded uninstall/reinstall sign-in run for first-install evidence.

Disconfirming evidence: old onboarding objects return, unrelated objects disappear, the returning-user flow intercepts replay, or the operator still interprets replay as a fresh account.

## Decision rule

Keep the scoped replay if it supports repeated local iteration without data-boundary surprises. If not, add an operator-side disposable-account lifecycle after defining credential custody and backend target; do not move admin authority into the client.

## Instrumentation

No product analytics. Test IDs and manual evidence are sufficient for a development-only utility.
