# Diverge: Repeatable Onboarding Testing

Axis: speed versus proof fidelity.

## 1. Full account deletion in DevTools

Call the existing account-deletion service and return to sign-in. This has high proof fidelity, but it permanently deletes all cloud data and leaves a provisioned email credential unusable until an operator recreates the user. It is too destructive for a quick replay control.

## 2. Presentation-only replay

Keep all data and simply reopen onboarding. This is fastest and matches the current action, but previous onboarding-created objects remain and the label can be mistaken for a clean account reset.

## 3. Scoped onboarding-artifact replay

Use the recorded onboarding Arc/Goal pointers to remove only the last onboarding-created object graph, clear onboarding answers and one-time guides, then reopen onboarding. Keep the auth identity and unrelated data. This offers a fast, honest replay while clean-install/new-identity testing remains separate.

All alternatives touch onboarding metadata and the onboarding-created Arc/Goal/Activity graph only. None changes the four-object model, blocks capture, adds pressure mechanics, or grants hidden authority.
