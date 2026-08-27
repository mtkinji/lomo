# Screen Time Control Plane

**Status:** Accepted system direction
**Date:** 2026-08-10
**Implementation host:** `/Users/andrewwatanabe/Kwilt`

Kwilt has one Screen Time product capability built on one control plane. Goals, Money, and Household do not create competing Screen Time products; they own different agreements that compile into the same device-enforcement system.

This document is the canonical system and navigation contract for Screen Time across Kwilt. It supersedes the global-navigation proposal in [`family-screen-time/navigation-and-workflows.md`](../design-explorations/family-screen-time/navigation-and-workflows.md). The family rule, child explanation, caregiver authority, and device-delivery decisions in that exploration remain valid.

Personal child-device identity and shared Household-device designation are owned by
[Household device participation](household-device-participation.md). Family Screen Time
consumes a guardian-managed personal-device binding; it does not require or create a
conventional child account, and it does not treat a shared Household iPad as Charlie's
personal Screen Time device.

## Decision

> Screen Time is a shared control platform, not a global place of work.

## Contextual shield return

Apple shield actions return to the last valid Kwilt page and present one root-level
`BottomGuide`; they do not force navigation into Settings, Money, Focus, or Today.
The guide receives semantic rule and selection identities from the native restriction
ledger without exposing Apple tokens to JavaScript. It routes to a condition owner only
after the person chooses **Do this first**.

Each personal real-step or Focus card is an independent rule with its own native
selection. Money categories and family agreements compile into the same shared rule
projection while remaining editable only in their canonical domains. Overlapping claims
retain AND enforcement.

An authorized self-managing adult, household owner, or scoped caregiver may create one
20-minute wall-clock opening only when every active claim can be overridden truthfully.
A child cannot self-open. Family changes remain **Applying** until the named child device
acknowledges the desired policy version. Expiry and foreground reconciliation operate on
named selections; ordinary transitions never use a global clear.

Users encounter Screen Time at the moment they create or understand an agreement:

- Personal agreements begin from Focus, Goals, To-dos, Plan, or **Settings > Screen Time**.
- Money agreements begin from the Money category whose condition powers the restriction.
- Family agreements begin from **People > Household > [Child] > Screen Time**.
- **Settings > Screen Time** provides one quiet overview of all active Screen Time agreements and routes back to their canonical owners.

Screen Time does not appear in the global capability menu. The menu answers **Where am I working?** Screen Time answers **What agreement should this device follow?** Adding it to global navigation would turn maintenance and enforcement infrastructure into a competing workspace.

Screen Time remains a named capability for product comprehension, commercial entitlement, onboarding, analytics, help, and system ownership. A capability does not need to be a global-navigation destination.

## Product Model

| Policy domain | Subject and authority | Condition owner | Canonical editor | Device authorization |
| --- | --- | --- | --- | --- |
| Personal | The signed-in person controls their own device | Focus, Goals, To-dos, or personal intent | Settings > Screen Time, with contextual setup links | Apple `.individual` |
| Money | The signed-in person controls their own device | A named Money category and its budget evidence | Money > Category > App controls | Apple `.individual` |
| Family | An authorized owner or caregiver manages a named child's device | Household schedule, optional assigned Activities, and usage allowance | People > Household > Child > Screen Time | Apple `.child` plus Kwilt household authority |

The domains share infrastructure but not authority or meaning:

- A Money rule cannot edit a Goal, Focus session, Activity, child membership, or family agreement.
- Screen Time references canonical Goal, Activity, Focus, and Money truth; it does not duplicate those objects.
- Household membership does not grant Apple device authorization.
- Apple authorization does not grant Kwilt caregiver authority.
- Commercial entitlement does not activate a capability for every child or prove that a device applied a policy.

## Information Architecture

```text
Global capability menu
├── Goals & Plans
├── Money
├── Fun
└── Chats

Avatar -> Settings
├── People
│   └── Household
│       └── Charlie
│           └── Screen Time             family editor and device setup
└── Screen Time                          cross-domain overview
    ├── My Screen Time                  personal editor
    ├── Charlie                         link to Household child editor
    └── Money                           links to categories with app controls

Contextual entry
├── Focus / Goal / To-do / Plan -> Set up personal protection
├── Money category -> App controls
└── Household child -> Set up or manage family Screen Time
```

### Settings overview

The existing **Settings > Screen Time Controls** route should evolve into **Settings > Screen Time**. It is an overview and router, not a universal rule builder.

It groups rows by policy owner:

```text
Screen Time

MY SCREEN TIME
Selected apps                               4
Do what matters first                      On
While Focus is running                     On

FAMILY
Charlie                        Needs device setup

MONEY
Shopping                       Review before access
Dining                         Running hot
```

Rules:

- Personal settings may be edited in place because this route is their canonical owner.
- A child row opens that child's Household Screen Time route.
- A Money row opens the owning category's App controls route.
- The overview never copies a family rule composer or Money policy editor.
- Empty groups stay absent unless a restrained setup invitation is useful.
- Status describes authoritative state: **Off**, **Needs setup**, **Applying**, **Applied**, or **Needs attention**. Route presence alone never means active.

### Contextual entry

Contextual prompts create or resume an agreement when its value is understandable:

- Focus: **Block distracting apps while Focus runs.**
- Goal, To-do, or Plan: **Block selected apps until you take a real step.**
- Money category: **Pause selected apps when Shopping needs review.**
- Household child: **Set up Charlie's Screen Time.**

Every contextual entry routes to the canonical editor with an intent and exact return target. It may choose useful defaults, but it does not create a separate setup system.

## Control-Plane Responsibilities

The shared control plane owns device-level mechanics that must behave consistently across domains:

1. Authorization scope and status.
2. Device identity and readiness.
3. Privacy-preserving app/category selection references.
4. Named `ManagedSettingsStore` identity.
5. Desired policy version and compiled enforcement projection.
6. Last received and last applied versions.
7. Reconciliation triggers and idempotent application.
8. Current enforcement outcome and human-readable reasons.
9. Bounded exceptions and expiry.
10. Deactivation, release, and acknowledged cleanup.

Policy domains own:

- the sentence users understand;
- the canonical source objects and conditions;
- who may change or bypass the agreement;
- the contextual editor and return destination;
- domain-specific analytics and success signals.

### Control intent types

The control plane accepts two policy primitives and one request workflow:

1. **Standing agreement** — recurring schedule, responsibility, and usage criteria.
2. **Temporary override** — an authorized caregiver blocks or allows a saved selection for a bounded wall-clock window.
3. **Access request** — a child request and caregiver decision that may create the same temporary override with request provenance. It is not a separate device-policy type.

Examples:

- **Games are available on weekdays from 4–7 PM for 30 minutes** is a standing agreement.
- **Block Brawl Stars for Charlie and Grant for three hours** creates block overrides.
- **Enable Brawl Stars for Charlie for 30 minutes** creates an allow override with an exact expiry.
- **Give Charlie 30 minutes of Brawl Stars** requests a usage budget, not a 30-minute wall-clock window, and requires Device Activity threshold support.
- **Give Charlie 10 more minutes today** may create an allow override after a child request or direct caregiver command.

Each intent compiles into the same monotonic child-device policy. Within the family domain, the newest applicable explicit caregiver override for a child and selection takes precedence over the standing family agreement and older overrides until it expires or is cancelled. An allow affects only named Kwilt family restrictions; Focus, Money, personal, safety, and external Apple restrictions remain independent. Expiry or cancellation triggers reconciliation of every remaining claim; it never calls a global `clearRestrictions()`.

### Saved selection references

Apple's `FamilyActivityPicker` exposes privacy-preserving opaque selections rather than an installed-app catalog. Kwilt therefore cannot promise that Chat can identify an arbitrary app name on first use.

- A caregiver explicitly chooses apps/categories through the native picker for the named child.
- Kwilt stores a caregiver-defined semantic label and a child-scoped `selectionId` in the shared control plane.
- Opaque Apple tokens stay in the authorized native boundary and are addressed through that `selectionId`.
- Chat may resolve **Brawl Stars** only when the relevant child already has a matching saved selection.
- A missing or ambiguous selection produces an exact native picker handoff and returns to the same Chat request.
- A multi-child command validates every child and selection before application. It does not silently produce a partial result.

### Target contract

```ts
type ScreenTimePolicyDomain = 'personal' | 'money' | 'family';

type ScreenTimePolicy = {
  id: string;
  domain: ScreenTimePolicyDomain;
  subject: { kind: 'self' } | { kind: 'child'; membershipId: string };
  deviceId: string;
  selectionId: string;
  conditionRef: { ownerId: string; policyType: string };
  desiredVersion: number;
  active: boolean;
};

type ScreenTimeApplicationReceipt = {
  policyId: string;
  deviceId: string;
  desiredVersion: number;
  appliedVersion: number;
  outcome: 'received' | 'applied' | 'cleared' | 'failed';
  occurredAt: string;
};
```

A temporary override adds bounded intent without changing the durable agreement:

```ts
type ScreenTimeTemporaryOverride = {
  id: string;
  subject: { kind: 'child'; membershipId: string };
  selectionId: string;
  action: 'block' | 'allow';
  startsAt: string;
  expiresAt: string;
  timeBasis: 'wall_clock' | 'foreground_usage';
  usageMinutes?: number;
  provenance: 'caregiver_direct' | 'child_request_approved';
  status: 'active' | 'cancelled' | 'expired';
  desiredVersion: number;
};
```

Wall-clock `block` and `allow` are both part of the first direct-control slice. Foreground-usage allowances remain behind signed-device Device Activity threshold proof. Every allow receipt must state that it changed Kwilt family policy only; it cannot promise to override another domain or Apple restriction.

This is a boundary contract, not a requirement to place every domain's policy fields in one generic table. Domain-owned condition data may remain in its owning module as long as it compiles into a versioned enforcement projection.

## Evaluation And Conflict Semantics

Each domain evaluates its own condition and produces an enforcement claim for a device selection. The shared reconciler combines the claims.

- An app is available only when every applicable active policy permits it.
- One satisfied policy never clears a restriction still required by another policy.
- An exception applies only to the policy and criteria it names.
- Safety/communication allowances and externally stricter Apple restrictions remain explicit boundaries.
- A family-managed restriction cannot be bypassed through a personal or Money editor.

When more than one policy blocks the same target, the UI leads with the most actionable current reason and makes the additional reasons inspectable. It must not imply that completing one action guarantees access when another agreement still blocks it.

Examples:

- **Finish today's plan first. Shopping also needs a budget review.**
- **Games are finished for today. Focus protection is also on.**

The exact reason-ordering algorithm should prefer a condition the person can act on now, then the nearest deterministic transition. Authority does not disappear from the explanation: a child always sees when a caregiver-managed agreement still applies.

## Selection And Native Store Isolation

Every independently reconciled selection receives a stable `selectionId` and a separately named `ManagedSettingsStore`. The existing native bridge already supports this shape.

- Personal default selection: stable personal identifier.
- Money selection: stable category-scoped identifier.
- Family selection: stable child-and-rule or child-and-policy identifier on the managed device.

Store isolation prevents one domain from clearing another domain's settings. It does not by itself solve conflict explanation, receipt truth, or cleanup; those remain control-plane responsibilities.

Apple's opaque app and category tokens stay inside the required native boundary. Routes, analytics, Household records, and general JavaScript state do not expose readable app identities derived from those tokens.

## Desired, Applied, And Released State

All domains converge on the same truth model:

```text
configured -> desired -> received -> applied
                                  -> failed / needs attention

deactivation desired -> cleanup received -> released
```

- **Configured** means the user expressed a valid agreement.
- **Desired** means the authoritative policy version should be on the device.
- **Applied** means the relevant device acknowledged that exact version.
- **Released** means shields, monitoring, cached policy, and device binding were cleared and acknowledged.

Authorization, configuration, commercial entitlement, and applied enforcement are separate states. No surface may collapse them into a single `enabled` boolean when that would overstate delivery.

Personal and Money flows may use a local receipt because their authoritative device is the current device. Family flows require child-device receipts attributable to the desired version. Push is a reconcile hint, never proof of application.

## Authority And Exceptions

- Personal and Money agreements are self-authored and locally reversible.
- Family agreements require Kwilt owner/caregiver authority for the named child plus `.child` authorization on the managed device.
- Either caregiver with scope may decide a bounded family exception.
- A family exception never edits the durable rule unless the caregiver explicitly chooses to edit it.
- A Money review opens only the relevant Money policy window.
- Completing a Goal, Activity, or Focus condition changes its referenced truth; Screen Time re-evaluates rather than mutating the source object.

## Commercial Packaging

Screen Time can be sold as one understandable unit of value even though its agreements have different owners:

> Put the right agreement between intention and impulse—for yourself, your money, and your family.

Commercial packaging is separate from policy authority and device readiness. A paid entitlement may unlock personal, Money-integrated, or family tiers, but it never:

- grants caregiver authority;
- activates Screen Time for a child;
- authorizes an Apple device;
- changes a Money category or Goal; or
- proves enforcement was applied.

Packaging and pricing remain a product decision. The control plane must support them without embedding billing assumptions in policy evaluation.

## Current Implementation State

As of 2026-08-10:

- Personal Screen Time uses `useAppStore.screenTimeProtection`, stable per-rule native selections, and `screenTimeProtectionRuntime`.
- The shared shield handoff preserves the current route and projects personal, Money, and family claims into the root contextual guide.
- Money app controls use category-owned persisted policies, category-scoped selection identifiers, and `moneyAppControlRuntime`.
- Family Screen Time uses server Household activation plus a local pre-TestFlight learning record with a development-only simulated acknowledgement.
- Personal and Money share the Apple bridge, but each runtime reconciles independently.
- Family native `.child` authorization, cross-device delivery, enforcement, and cleanup are not yet implemented or proven.

This is sufficient for bounded learning but not the permanent control plane. Simulator and automated contracts do not prove signed-device Family Controls authorization, Device Activity callbacks, background/offline enforcement, shields, expiry, or release cleanup.

## Migration Sequence

1. **Name the system.** Adopt this document and link every Screen Time brief to it.
2. **Create the overview read model.** Let Settings summarize personal, Money, and family policy state without moving their editors.
3. **Unify policy identity and receipts.** Introduce shared policy/selection identity, desired-applied state, and reconciliation results while preserving existing behavior.
4. **Centralize conflict reconciliation.** Ensure overlapping personal and Money policies cannot clear each other or present a false single reason.
5. **Add family device delivery.** Implement `.child` authorization, managed-device identity, compiled family policy, receipts, offline behavior, and cleanup.
6. **Prove on signed devices.** Exercise personal, Money, family, overlap, failure, reinstall, deactivation, and caregiver-failover paths before claiming the unit is shipped.

Each step should be independently verifiable and avoid a bulk rewrite of existing working policy domains.

## Acceptance Rules

- Screen Time remains absent from global capability navigation.
- Settings exposes one Screen Time overview, not three competing settings homes.
- Personal, Money, and family editors remain with their canonical condition owner.
- All policy application uses stable selection/store identity.
- One domain cannot clear another domain's active restriction.
- Desired and applied state remain distinguishable.
- Family authority, Apple authorization, entitlement, activation, and readiness remain separate.
- Every restriction has a plain reason and valid next action or next transition.
- Deactivation is not complete until managed cleanup is acknowledged.
- No shipping claim exceeds its Simulator, build, signed-device, TestFlight, or production evidence.

## Related Product Documents

- [`family-screen-time-device-enrollment-and-reconciliation.md`](family-screen-time-device-enrollment-and-reconciliation.md) — canonical child-device enrollment, device-channel, receipt, snapshot, readiness, recovery, and release contract.
- [`screen-time-controls-contextual-setup.md`](../feature-briefs/screen-time-controls-contextual-setup.md) — personal Focus and meaningful-first agreements.
- [`screen-time-controls.md`](../feature-briefs/screen-time-controls.md) — Money-originated Screen Time reasoning from the standalone source.
- [`family-screen-time-controls.md`](../feature-briefs/family-screen-time-controls.md) — caregiver/child agreements and delivery truth.
- [`unified-settings-architecture.md`](../unified-settings-architecture.md) — global, contextual, object, and session settings ownership.
- [`unified-kwilt-capability-platform.md`](unified-kwilt-capability-platform.md) — capability boundaries and shared-shell direction.
