# Converge: Kwilt Money Capability Integration

## Qualitative comparison

| Alternative | Persona fit | One-shell fit | Workflow fidelity | Lifecycle/performance | Migration risk | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| A - Embed standalone app | partial | weak | strong initially | weak | high | Reject |
| B - Capability-native port | strong | strong | strong | strong | medium, staged | Choose |
| C - Shared package first | strong | medium | strong | medium | medium | Use selectively |
| D - Rebuild in Kwilt | uncertain | strong | weak/unknown | strong | high | Reject |

## Chosen alternative

Choose **B - Capability-native port**. Port from an immutable Money source SHA into a
Money-owned capability directory. Retain the Summary/Transactions/Accounts local model and
finance visual language. Replace Expo Router, standalone auth, RevenueCat, root privacy,
settings, launch, and extension ownership with host contracts.

## Capability delta

Today, a user cannot:

- open Money from the Kwilt capability menu;
- see existing `budget_*` data through the current Kwilt session;
- move between Money and Chat with exact context and return;
- rely on one settings, privacy, entitlement, and account-deletion truth.

After the first learning release, a user can:

- open Money from Option G;
- navigate Summary, Transactions, Accounts, category detail, and transaction detail;
- see the same live read-only financial data as the standalone app under the same user UUID;
- leave Money and return without losing the local place or selected object;
- unlock protected Money content with native Face ID/passcode behavior when required.

Still intentionally unsupported in that release:

- creating or editing categories and living-plan targets;
- transaction corrections and merchant-rule writes;
- Plaid linking/relinking;
- Money Screen Time controls or widgets;
- Money mutation tools in Chat;
- retiring the standalone TestFlight app.

## Accepted trade-offs

- The first unified Money build is read-only even though the standalone app supports writes.
- Some pure domain modules may be copied before they are physically reorganized; parity and ownership matter more than a perfect folder move.
- Existing standalone widget placement, app-group state, and Screen Time opaque selections will require reconfiguration in unified Kwilt.

## Rejected trade-offs

- No WebView or nested Expo Router.
- No second Supabase client/session store, RevenueCat provider, settings home, or account deletion implementation.
- No fixture fallback when a signed-in live query fails.
- No simultaneous Money and Games import.
- No global startup of Money services.

## Reductive design decisions

- Add one global menu item: `Money`.
- Keep only three Money local places: Summary, Transactions, Accounts.
- Use unified Chat rather than porting standalone Ask.
- Put connection, privacy, app-control, and category settings behind contextual/global settings ownership; do not add `More` as a fourth Money place.
- Leave Money financial objects as Money objects; cross-capability links are explicit references, not object-model fusion.

## Activation path

Money appears as an active capability only in the integration build after the read-only
vertical slice is coherent. First entry explains only that existing Money data is available
inside Kwilt; it does not replay financial onboarding for an existing Money user. A user
without Money data gets a calm empty state and no Plaid permission request until they choose
to connect an account in a later write/native phase.

## System implications

- Add a `money` capability and group to the registry.
- Add a top-level React Navigation Money navigator with local tabs and nested details.
- Bump/migrate persisted navigation state for the new root.
- Extend deep links and unified Chat context/return types for category, transaction, and account objects.
- Introduce a Money runtime whose subscriptions and sensitive presentation follow capability activation.
- Reconcile repository ownership for already-live Money migrations and Edge Functions before new backend work.

## Bet

We're betting that preserving Money's local product contract while replacing only its
application-level ownership will make the unified experience feel coherent without reducing
financial trust. If it turns out not to be true, revisit the local navigation/header adapter
before changing Money's domain model or adding more native features.

## Success signal

On the same signed-in physical device and account, unified Kwilt renders the same current
month totals, category state, transaction inventory, and account inventory as the accepted
standalone Money build; switching away starts no continuing Money work; and returning restores
the exact Money place/object without an auth, router, or fixture discontinuity.
