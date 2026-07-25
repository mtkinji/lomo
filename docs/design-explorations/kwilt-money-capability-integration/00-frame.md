# Frame: Kwilt Money Capability Integration

## What the user said

> We've made a lot of progress in migrating to the new navigation paradigm so that we can fold in Quilt Money and Quilt Games into the app. I think what I would like to do first is create a new branch to fold in Quilt Money. I need you to think comprehensively about how that should work and come up with a plan to do it.

The product and repository use the spelling **Kwilt Money**.

## Restated in user voice

When I use Kwilt to run family life, I want my household money reality to live in the
same dependable place as the rest of my life system, so I can understand and act on it
without changing apps, relearning navigation, or wondering whether the data is current.

## Target audience

`audience-aspirational-family-organizers`: households that want calm help staying
organized without adopting a productivity or finance methodology.

## Representative persona

**Maya** is already using Kwilt for ordinary household commitments and wants Money to
feel like a native part of that relationship.

- Current situation: her financial data and Money workflows exist in a separate TestFlight app.
- What she is trying to do: see the month, review transactions, and make intentional spending choices in one trusted app.
- Emotional state or tension: she values the leverage but treats stale or misleading financial truth as a trust-breaking failure.
- What would make this feel wrong: a generic dashboard, a second app shell hidden inside Kwilt, surprise permissions, lost data, or a flattened workflow that no longer feels like Money.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - household financial intentions matter only when
they stay connected to actual spending and timely decisions.

## Job flow step

`job-flow-maya-review-budget-reality-before-spending`. Unified Kwilt currently scores 1
across the flow because it exposes no Money capability. The separate app has meaningful
delivery, live data, and native behavior that must be preserved rather than reimagined
during integration.

## Active anchors

- `jtbd-put-intention-before-impulse` - Money makes chosen limits present at spending time.
- `jtbd-carry-intentions-into-action` - the plan must stay reconciled with real transactions.
- `jtbd-trust-this-app-with-my-life` - finance, identity, privacy, and mutation truth are high-trust surfaces.

## Friction we're addressing

The shell is ready to host more capabilities, but Money still owns a standalone Expo Router
root, auth storage, RevenueCat provider, tab shell, settings home, privacy gate, app group,
widgets, Screen Time extensions, and native dependencies. Copying that application into
Kwilt would create two global owners and invalidate the unified-navigation premise.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: Option G side sheet, shared avatar/settings, a capability registry, lifecycle coordinator, unified Chat, and React Navigation root already exist in Kwilt.
- Existing Money flow: Summary, Transactions, and Accounts are the three local places; category and transaction detail sit beneath them.
- Existing domain/data model: the live Kwilt Supabase project already contains RLS-enabled `budget_*` tables, Money migrations, and Plaid Edge Functions under the same user UUID.
- Existing technical affordances: both apps use Expo 54, React Native 0.81.5, React 19.1, and the same Supabase project, but Money adds Skia/Victory, Plaid Link, LocalAuthentication, widgets, and Screen Time targets.
- Existing UX/copy conventions: the host owns global navigation and settings; Money remains blue, finance-specific, information-dense, and explicit about actual/planned/forecast values.

Constraints to preserve:

- One React Navigation root, auth session, entitlement owner, analytics owner, notification owner, deep-link namespace, settings registry, account deletion path, and release train.
- Money keeps its local Summary/Transactions/Accounts model and distinctive visual language.
- No Money work before entry; capability activation is idempotent and deactivation releases subscriptions and transient resources.
- Signed-in live states never silently fall back to fixture data.
- Existing Money data appears under the same account without copying, relinking, or reset.
- Current standalone Money work is not imported until it is committed to an immutable source SHA.

Constraints we may challenge:

- The accepted program sequence previously imported Games first. This exploration changes the sequence to Money first at the user's direction.
- Money's standalone local tab implementation may be extracted into a reusable capability-place bar, but its information architecture remains intact.

Design implication:

Port Money as a capability, not as an application. Translate its route tree into a
React Navigation capability navigator; adapt screens to host-owned auth, entitlements,
headers, settings, and Chat; then add native dependencies and writes in independently
verifiable phases.

## Aspirational design challenge

How might we help Maya understand and act on household money reality inside the one Kwilt
app, while preserving Money's trustworthy local workflow, financial privacy, and a fast,
calm experience everywhere else in Kwilt?

## Out of scope

This branch produces the decision artifacts and implementation plan. It does not import
Money code, alter production Supabase, merge, push, or ship a build.

## Open question

Which committed Kwilt Money SHA should become the import source after the active
`codex/target-backed-category-adjustment` work is checkpointed?
