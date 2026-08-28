# Learning Release: Screen Time Rule System Consolidation

## Concept To Build

Build one Screen Time capability in which every personal rule—whether based on Money, Focus, a real step, time of day, or daily usage—is created, read, edited, enabled, explained, and deleted through the sentence-based composer and one canonical rule store.

## Capability Delta

Today, the user cannot:

- Trust that every rule in **My rules** opens the same editor or shares the same lifecycle.
- Combine budget truth with another condition in one readable rule.
- Enter from Money and remain inside the canonical Screen Time system.
- Remove a visible rule with confidence that no parallel subsystem will reapply it.

After this release, the user can:

- Create a rule such as **Allow access to Social when time of day is after 5:00 PM AND daily use is below 15 minutes**.
- Create a rule such as **Pause access to Shopping when Shopping is 95% used** from either Screen Time or Money.
- Open either rule in the same sentence composer and change its targets, outcome, conditions, connector, enabled state, or lifecycle.
- See the same rule identity used by Settings, contextual entry, Chat, explanation, and native enforcement.

Still intentionally not supported:

- Preserving the existing development rules.
- Arbitrary nested conditions or a generic automation language.
- Complete Household persistence consolidation.
- Silent AI selection or activation of native app restrictions.
- Production enforcement claims without signed-device evidence.

## User Experience

### Clean start

On the first launch of the learning release, Kwilt safely clears all legacy personal and Money Screen Time enforcement and deletes their stored rules. Successful cleanup is silent. Settings > Screen Time shows the canonical empty state and one **Add rule** path for personal rules.

If cleanup cannot prove that old native restrictions were removed, the user sees a calm recovery row in Screen Time Settings. The recovery action retries clearing retired restrictions or asks the user to review Screen Time access. It does not mention schemas, migration, stores, or subsystems.

### Create from Screen Time

The user chooses apps or categories, then enters the sentence composer. The rule reads as one editable statement:

> Allow access to [Apps and categories]
>
> When [Condition] [Operator] [Value]

Adding a second condition extends the statement and reveals one explicit **AND/OR** connector. The composer contains no separate behavior page, duplicated summary receipt, `Rule enabled` section, or bottom danger zone.

### Create from Money

Money category detail offers **Add app rule**. It opens the same Screen Time composer with:

- the relevant budget selected;
- a sensible budget predicate selected or clearly unresolved;
- app selection still owned by Apple's picker;
- a visible route back to the originating Money category.

The saved rule appears in **My rules** without a separate Money rule type. Its sentence names the budget because the condition requires that context.

### Govern a saved rule

The **My rules** row opens the sentence composer. Its trailing switch directly enables or disables the rule. Swipe reveals Delete. The edit-page overflow contains Turn on/off and Delete. Native explanation and temporary-open behavior use the same aggregate.

## Existing Product Relationship

This release replaces:

- the Money-owned Screen Time rule editor and budget picker;
- Money app-control policy storage and reconciliation;
- legacy personal rule storage and projection;
- Money-specific rule rows and navigation;
- duplicated lifecycle controls and rule-management sections.

It enhances:

- Settings > Screen Time as the canonical management surface;
- the existing sentence-based composer;
- Money category detail as a contextual entry point;
- Focus, Activities, and Chat handoffs into the same composer;
- native explanation and temporary-open handling.

It leaves unchanged:

- Money category calculations and financial truth;
- Apple's authorization and private app picker;
- the distinction between personal and Household authority;
- Household delivery until its canonical adapter is separately completed.

## Buildable Slice

### Must be real

- One canonical personal rule schema and store.
- The existing sentence composer as the only personal-rule editor.
- Typed condition-provider contracts for Money, Focus, real-step, daily usage, and time of day.
- AND/OR evaluation that matches the visible connector.
- Contextual Money entry with budget preselection and exact return.
- Idempotent legacy cleanup that clears native restrictions before deleting records.
- Removal of legacy writers, editors, routes, reconcilers, and inventory branches.
- One canonical lifecycle for create, update, toggle, delete, overlap, temporary open, and relaunch.
- Privacy-safe cleanup and enforcement diagnostics that never expose opaque app identities.
- Simulator proof for UI/state and signed-device proof for actual Screen Time behavior.

### Can be thin or temporary

- The cleanup receipt may remain local and developer-inspectable.
- Internal parity logs may use bounded structured logging instead of analytics.
- Contextual Focus and real-step entry can reuse their current handoff parameters without broader onboarding redesign.
- Household may use an adapter or remain unavailable from the new composer during this learning release, provided it does not expose a competing editor.
- Chat may initially support list/get/deactivate/delete plus reviewed open-in-composer rather than full field-level editing.

### Intentionally excluded

- Migration of existing rules or preservation of their app selections.
- A user-facing reset or migration wizard.
- New coachmarks, green interstitials, dashboards, provider settings, or rule naming.
- Nested Boolean groups, ordering, priority, or sequential rule execution.
- New Money predicates or changes to financial calculations.
- Broad production rollout before entitlement and upgrade proof.

## Release Channel

**Local build** on Andrew's entitlement-enabled physical iPhone, supported by the iPhone 17 Pro Simulator for repeatable visual and state coverage.

This is the smallest channel that can produce truthful learning because Apple Screen Time enforcement cannot be proven in the Simulator. The learning release should be a real bundled app experience, not a web prototype, but it should not reach TestFlight until local upgrade cleanup and representative signed-device enforcement pass.

## Brand-Goodwill Guardrails

- Existing development rules are intentionally discarded only because Andrew explicitly waived their preservation; do not generalize this reset to production users without a separate decision.
- Never delete a legacy record before its native restriction is cleared or explicitly marked for recovery.
- Successful cleanup is silent; failure receives one concrete recovery action.
- Budget language remains descriptive and non-shaming.
- The composer exposes one readable rule, not internal provider or migration concepts.
- A disabled or deleted rule must not continue enforcing through a retired runtime.
- No app identity, bundle identifier, or financial detail is added to diagnostics.

## Reversibility

Code rollout remains reversible before distribution through the existing branch and build process. Data rollback is intentionally not offered because existing development rules are being discarded. Instead:

- cleanup is versioned and idempotent;
- an interrupted cleanup resumes safely on relaunch;
- failure preserves enough selection identifiers to retry native clearing;
- the canonical store does not become active until retired restrictions are cleared or explicitly reconciled;
- TestFlight is blocked until install-over-current-build cleanup passes.

## Permanent Product Threshold

Promote the consolidated system when Andrew can repeatedly create, understand, edit, combine, toggle, temporarily open, relaunch, and delete representative rules from both Settings and Money on a signed device without encountering a legacy surface or orphan restriction.

Before production use with people whose rules must be preserved, make an explicit follow-on decision between a supported migration path and a communicated reset. Andrew's waiver applies only to this learning release and current development data.
