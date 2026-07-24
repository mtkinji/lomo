# Family Participation and Screen Time Program

## Program decision

Family Screen Time is not one feature. It is the first demanding consumer of several family-system capabilities that must be useful and trustworthy independently.

The work should be governed by four draft feature briefs:

1. [Household Foundation](../../feature-briefs/household-foundation.md)
2. [Household Activity Assignment](../../feature-briefs/household-activity-assignment.md)
3. [Chores as Recurring Assigned Activities](../../feature-briefs/chores-as-recurring-activities.md)
4. [Family Screen Time Controls](../../feature-briefs/family-screen-time-controls.md)

These briefs are the specs. Kwilt should not create a parallel `docs/specs/` taxonomy.

## System reduction

The program introduces three system primitives, not four:

1. **Household** — private membership, roles, dependent profiles, and capability-scoped authority.
2. **Activity participation** — assigning one Activity to a household member is the explicit sharing boundary.
3. **Family access policy and device enforcement** — versioned rules applied and acknowledged by a managed child device.

**Chore** is a product behavior built from an assigned recurring Activity. It may eventually be an Activity type or preset, but it is not a fifth core object and does not own separate completion truth.

## Dependency graph

```text
Checkpoint 0: accept contracts and vocabulary
                       │
                       ▼
Checkpoint 1: Household foundation
          ┌────────────┴─────────────┐
          ▼                          ▼
Checkpoint 2A: Assignment       Checkpoint 2B: Managed device
          │                          │
          ▼                          ▼
Checkpoint 3A: Chores           Checkpoint 3B: Time-of-day controls
          └────────────┬─────────────┘
                       ▼
Checkpoint 4: Chore-gated Screen Time agreement
                       │
                       ▼
Checkpoint 5: Family learning release
```

The two branches may be designed and built independently after Household, but neither may invent its own member, child, role, or device identity.

## Checkpoints

### Checkpoint 0 — Contract acceptance

No product code.

Accept:

- vocabulary and object boundaries;
- role and capability-authority matrix;
- private-by-default data policy;
- the progressive-disclosure UX contract in [UX Review: Household Assignment in To-dos](./ux-review-household-assignments.md);
- dependent-profile identity model;
- offline and event-history posture;
- migration and release gates; and
- the four feature briefs at `accepted` status.

Exit evidence:

- Every proposed table and user-facing surface has one owning brief.
- No unresolved question changes the privacy or authority model.
- The existing personal Activities and `.individual` Screen Time paths have explicit non-regression requirements.

### Checkpoint 1 — Household foundation

Deliver one private household with two independently authenticated caregivers and one dependent child profile. Do not share Activities or control a device yet.

Activation is just in time: adding or inviting the first other person creates the Household and owner membership atomically. Ordinary personal onboarding does not create an empty Household.

The checkpoint is useful because the family can establish who belongs and who may administer future family capabilities without sharing credentials.

Exit evidence:

- Create household, invite/accept caregiver, add dependent child, remove/release member.
- Server-authorized role mutations and negative RLS tests.
- Household membership grants no implicit access to personal Goals, Activities, Money, or other capability data.
- Offline clients can retain a last-known roster for explanation but cannot make authority-changing mutations offline.

Stop/go question:

> Can Andrew and Blaire both explain who can do what, and does the household feel like a private family boundary rather than another social group?

### Checkpoint 2A — One-off Activity assignment

Allow a creator to choose **Assigned to** and assign one Activity to one household member. Before Household setup, **Assign to someone...** may initiate the first-person flow. No recurrence, chore language, rewards, or Screen Time consequence.

The checkpoint is independently useful for errands, pickups, and household handoffs.

Exit evidence:

- Unassigned means private to the creator.
- Assignment shares only that Activity with the assignee.
- The assignee can see and complete it according to policy.
- Unassignment, reassignment, household removal, deletion, and linked-private-Goal behavior are explicit.
- Creator and assignee converge after offline completion or edit conflict.

Stop/go question:

> Does assignment feel like a lightweight family handoff people would use even without Screen Time?

### Checkpoint 2B — Managed child device

Enroll one physical child device under the Household using Apple's guardian-authorized Family Controls path. Do not depend on chores.

Exit evidence:

- Profile/device binding, capability report, authorization state, and caregiver-authenticated release.
- Child cannot use Kwilt sign-out or unlink as a bypass.
- Desired policy version and applied-device receipt are distinct.
- Signed physical-device proof; simulator or schema proof does not satisfy this checkpoint.

Stop/go question:

> Can the family trust that “managed” means the intended device is actually enforcing the last acknowledged policy?

### Checkpoint 3A — Chores as recurring assigned Activities

Add recurrence occurrences and child-appropriate completion/review semantics to assigned Activities. Present a small **Chores** projection only if it helps the family find this work; do not create a separate chore record.

Exit evidence:

- Today's occurrence is distinct from its repeating series.
- Child completion can be trusted automatically or await caregiver review according to the Activity policy.
- Today/future reassignment is explicit.
- A full offline day works from preloaded occurrences and an idempotent outbox.
- No points, streaks, allowance, rankings, or screen-time currency.

Stop/go question:

> Can the child understand what is theirs today and complete it without a parent standing beside them?

### Checkpoint 3B — Family time-of-day Screen Time controls

Create one family rule for selected apps/categories and a local-time window, with an optional foreground-usage cap. Do not depend on Activity completion yet.

This is independently valuable: “Games are available from 4:00–7:00 for up to 30 minutes.”

Exit evidence:

- Caregiver creates and activates a versioned rule.
- Child sees why access is open or blocked and the next transition.
- Device enforces windows and usage thresholds while Kwilt is closed and offline.
- Caregiver sees applied, offline, or needs-attention delivery truth.
- A bounded exception expires automatically.

Stop/go question:

> Does predictable schedule-based access materially reduce routine unlock requests before chores are involved?

### Checkpoint 4 — Chore-gated family access agreement

Allow the family rule to reference one or two assigned Activity occurrences:

> Games are available from 4:00–7:00 after today's responsibilities are complete, for up to 30 minutes.

Exit evidence:

- One deterministic AND evaluation joins schedule, occurrence state, and usage cap.
- Completing an eligible occurrence re-evaluates locally without requiring a cloud round trip.
- Unassigning, deleting, rescheduling, or changing review state produces an explicit rule consequence.
- Decision events, device application, and child-facing explanation are causally traceable.
- The behavior still feels like a family agreement, not chore currency.

Stop/go question:

> Does adding responsibility state reduce more interruptions than it creates confusion, disputes, or administrative work?

### Checkpoint 5 — Family learning release

Run the bounded Andrew/Blaire learning release with two caregivers, one dependent child, one managed device, one active agreement, and normal connected/offline days.

Exit evidence:

- Signed-device and TestFlight evidence remain separately named.
- Both caregivers can handle an exception without shared credentials.
- Reboot, missed push, cloud outage, stale policy, reinstall/release, and caregiver failover are exercised.
- Qualitative learning answers the program bet; broad release, billing, and App Store Family Sharing remain separate decisions.

## Spec ownership matrix

| Contract | Owning brief | Consumers |
| --- | --- | --- |
| Household identity, membership, roles, dependent profiles | Household Foundation | Assignment, Chores, Screen Time, future family capabilities |
| Activity creator/assignee, sharing boundary, completion events | Household Activity Assignment | Chores, Screen Time |
| Recurrence occurrences, review policy, child chores projection | Chores as Recurring Assigned Activities | Screen Time |
| Managed devices, rules, enforcement, exceptions, receipts | Family Screen Time Controls | Screen Time capability |
| Personal Activity privacy | Household Activity Assignment | Every capability |
| Capability-scoped caregiver authority | Household Foundation | Screen Time and future family capabilities |

## Cross-cutting acceptance suite

Each implementation plan must trace its tests back to these contracts:

- **Privacy:** membership alone reveals no personal capability data.
- **Authority:** roles and capability grants are server-enforced, not inferred from client UI.
- **Identity:** household member/profile identity is distinct from auth identity and Apple Family Sharing identity.
- **Offline:** local completion and enforcement state have bounded, deterministic behavior.
- **Reconciliation:** commands are idempotent; desired state, applied state, and receipts remain distinct.
- **Removal:** unassignment, member removal, device release, and authorization revocation have explicit cleanup.
- **Migration:** existing personal Activities and adult `.individual` Screen Time remain unchanged until deliberately adopted.
- **Proof:** simulator, signed-device, TestFlight, and production evidence are never collapsed.

## Roadmap priority against Maya's job flow

The top underserved steps remain:

1. **Schedule or hand off** — 2/5. Household + Assignment provide the first direct improvement.
2. **Family participation** — 2/5. Assignment + Chores improve participation without requiring Screen Time.
3. **Know the next doable action** — 2/5. A child-facing assigned/chores view makes the next responsibility concrete.

The recommended next design challenge is therefore Household Foundation followed by one-off Assignment—not Screen Time enforcement. The managed-device branch can be specified alongside them, but implementation should not begin until the shared identity and authority contract is accepted.

## Program non-goals

- A universal family social graph.
- Automatic sharing of existing personal data.
- A generic role table reused for every kind of collaboration.
- A new Chore object or duplicate completion store.
- Rewards, allowance, points, leaderboards, surveillance, or behavior scoring.
- Multiple children/rules/devices before the one-family learning path is dependable.
- App Store Family Sharing as a substitute for Kwilt household identity or authority.
