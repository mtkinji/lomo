# Frame: Repeatable Onboarding Testing

## What the user said

> I need a solid way to repeatedly test onboarding to the app. We've already setup an email based sign in method that should enable that, now I need a totally fresh install so I can see how it goes. Then I should be able to quickly and easily "reset" the account - perhaps through a dev tools toggle?

## Restated in user voice

When Andrew changes onboarding, he needs to distinguish a genuinely new install and identity from a fast in-app replay, so he can trust what each test proves without repeatedly doing broad, unsafe account cleanup.

## Target audience

`audience-faith-and-values-driven-builders`: the product audience whose first-run experience forms an identity direction. The immediate operator is Andrew testing Kwilt.

## Representative persona

Sarah represents the onboarding experience; Andrew is the development operator.

- Current situation: onboarding spans local storage, Supabase identity, and synced domain data.
- What they're trying to do: repeat onboarding quickly while retaining a trustworthy clean-run proof.
- Emotional state or tension: iteration should be fast, but hidden retained state makes results suspect.
- What would make this feel wrong: a control labeled as an account reset that leaves cloud state behind or deletes unrelated data.

## Hero anchor

`jtbd-see-who-im-becoming` - onboarding must reliably help Sarah recognize and name an identity direction. `jtbd-trust-this-app-with-my-life` governs the reset boundary.

## Job flow step

`job-flow-sarah-see-who-im-becoming`, the first-run identity-formation steps. The experience exists, but repeated test provenance is currently ambiguous.

## Active anchors

- `jtbd-trust-this-app-with-my-life` - the test harness must state its data boundary truthfully.
- `jtbd-see-who-im-becoming` - the harness exists to repeatedly assess the identity-forming onboarding job.

## Friction we're addressing

The existing DevTools action replays first-time UX, but its label does not explain that the signed-in identity and most account data remain. A clean simulator install is a separate operation, and an old or populated email account is still a returning account.

## System alignment

Constraint posture: `Fit the system`

Current system facts:

- Existing surface: development-only `DevToolsScreen`, under **Seed & reset**.
- Existing flow: `resetOnboardingAnswers()` followed by `startFlow()`.
- Existing model: onboarding-created Arc and Goal IDs are retained in `useAppStore`; removing an Arc already removes its Goals and Activities.
- Existing affordance: account deletion already performs full cloud deletion and local cleanup through a guarded production path.
- Existing convention: destructive account deletion is explicit and separately confirmed; DevTools is never available in production.

Constraints to preserve:

- No service-role secret or privileged reset endpoint in the app.
- No claim that a replay is a fresh install or new account.
- No deletion of unrelated Arcs, Goals, Activities, or capability data.
- App Review demo accounts keep their separate operator-owned reset contract.

Design implication: improve the existing DevTools action rather than adding a toggle or a second settings surface. Pair it with an explicit clean-install runbook.

## Aspirational design challenge

How might we help Andrew repeatedly inspect onboarding from an intentional starting point, while preserving truthful identity and data boundaries?

## Out of scope

Public email registration, a privileged in-app backend wipe, resetting App Review demo cohorts, and claiming physical-device proof from Simulator runs.

## Open question

None for the local learning release.
