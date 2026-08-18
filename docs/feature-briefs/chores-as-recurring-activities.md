---
id: brief-chores-as-recurring-activities
title: Chores as Activity-backed Household Work
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-carry-intentions-into-action, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-household-foundation, brief-household-activity-assignment, brief-family-screen-time-controls, brief-shared-household-device-profiles]
owner: andrew
last_updated: 2026-08-18
---

# Chores as Activity-backed Household Work

## Context

Families repeat ordinary responsibilities and need current household work to be legible to a child. Some chores are assigned; others are chosen from a shared pool. Kwilt should support that rhythm without creating a separate task/completion database or confusing chore completion, token earnings, Screen Time eligibility, and device enforcement.

## Target audience

`audience-aspirational-family-organizers` wants repeatable family organization that children can actually adopt without ongoing administrative upkeep.

## Representative persona

Maya wants each child to see assigned responsibilities alongside their personal To-dos, choose additional work from a shared family pool, complete it independently, and receive truthful credit without Maya manually recounting the week.

## Aspirational design challenge

How might we let Maya's family assign or choose recurring household work while keeping Activity occurrences canonical, the child's personal responsibility list coherent, and every form of credit understandable?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` is the demand spine because routines matter only when today's responsibility becomes real follow-through.

## Job flow step

`job-flow-maya-move-family-life-forward` scores **Family participation** 3/5. Household participation foundations exist, but ordinary household responsibility and a child-friendly projection of the next doable chore remain early.

## JTBD framing

When household work needs doing, Maya wants each child to see what is theirs, choose what is available, and receive trustworthy credit without duplicate lists or repeated negotiation, so the household rhythm moves with less reminding.

## Design

### Product and domain stance

A chore is an Activity with a household-aware Chore profile. Activities remain the canonical underlying object; occurrences remain the canonical execution and completion unit. Kwilt does not expose a generic Activities surface: **To-dos** is the current representation of ordinary Activities, while **Chores** is the household-work representation.

The Chore profile owns open-pool participation, chore availability, optional review, chore-count credit, token value, and current-agreement participation. It must not create a second task or completion store. Chore availability, a person's expectation, and a benefit link may each have an optional effective period; there is no required Season object.

Detailed decision ledger: [Activity-backed Chores system design](../design-explorations/chores-capability/activity-backed-system-design.md).

### Recurrence and occurrence contract

- Stable recurring series.
- Dated occurrence identity.
- Assignment, open-pool eligibility, availability, and review policy inherited from the series with explicit occurrence overrides.
- Completion of one occurrence never completes future occurrences.
- Reassign today versus this and future occurrences is explicit.
- Schedule/time-zone changes have deterministic occurrence behavior.
- Chore recurrence can express daily, once-weekly, bounded-repeat, cooldown, and manual availability without copying one checkbox.
- One occurrence may be projected into Chores and To-dos, but it retains one identity and completion history.

### Completion policy

- **Trusted completion:** local completion immediately becomes qualifying truth unless later corrected through explicit history.
- **Caregiver review:** the child submits completion; the occurrence remains **Waiting for approval** until an authorized caregiver approves or returns it for rework.

Returning work uses the child-legible state **Needs another pass**, not rejection language. The original performer and performance time remain attached to the occurrence. An approval records the reviewing caregiver and review time but qualifies the original performance fact.

Review is a Chore policy on the Activity series or occurrence, not a universal Activity requirement. Approval qualifies the original performer and performance time, not the caregiver or approval time.

A child may optionally attach one photo to the occurrence before or after submitting review-required work. The photo is evidence offered by the child, not a required proof gate and not input to automated judgment. In review, the submitted photo and a compact performer identity pill replace explanatory authorship copy.

One qualifying completion:

- contributes one occurrence to chore progress unless the household explicitly chooses token-weighted criteria;
- advances the performing child's existing Kwilt show-up streak once for the local performance day;
- appends the configured token earning; and
- may become a Screen Time input fact without claiming that device enforcement changed.

### Surfaces

- Chores is a direct capability in the main capability menu rather than a subsection of To-dos.
- Chores uses the quiet inventory grammar of Groceries: a simple header, compact progress, grouped rows, direct completion, and no dashboard chrome.
- The child-facing sections are **For [member]** for assigned/claimed occurrences and **Household** for currently available open work with a direct **Take** action.
- To-dos continues to present personal Activity responsibility and canonical occurrence completion.
- An assigned chore occurrence appears in the child's To-dos.
- An open-pool chore remains in Chores until the child claims it; the claimed occurrence then also appears in their To-dos.
- Mere eligibility for the pool does not flood To-dos with every household chore.
- **Assigned to me** appears only after inbound assigned work exists and auto-hides when empty.
- Assigning a recurring Activity to a child removes its daily occurrences from the creator's personal views; the caregiver inspects them through the authorized child/member scope.
- Chores presents the current agreement, assigned chores, shared pool, claim/release, review state, chore progress, and tokens.
- Tapping a chore row opens one lightweight detail drawer rather than a full detail route. It shows the chore identity, who may do it, a concise definition of done, meaningful timing, optional token value, and the one current action. The completion circle remains the fast path.
- Chore count is the universal progress fact. **Use tokens** is a household-level optional program and is off by default. When disabled, token values, balances, and token vocabulary disappear completely. When enabled, token value remains quiet trailing row metadata and is visible before a child takes work. Recurrence, availability policy, and agreement configuration stay out of the inventory.
- Caregiver attention stays capability-owned: a caregiver-only count badge on Chores and a contextual floating guide open one review drawer. Child Household Mode never exposes caregiver review counts or controls.
- One pending approval opens directly to its review detail. The title remains alone in the header; the submitted photo, when present, is the dominant review evidence and a compact avatar/name pill identifies the child below the chore criteria. Several approvals open a scroll-safe queue; each item can be approved directly or opened in the same drawer for **Needs another pass**. The primary **Approve** action includes a checkmark. The first slice does not include blind bulk approval.
- The child sees only currently relevant occurrences, not future copies of the recurrence series.
- Adult personal To-dos receives no chore chrome merely because a Household exists.
- No household KPI dashboard, Chore-specific streak, score, ranking, or overdue shame.

### Household Mode and member switching

On a designated shared iPad, one assigned caregiver account remains authenticated beneath a restricted Household Mode. The existing capability-menu avatar and the Chores-header member chip are two presentations of one identity control and open the same switcher.

- The switcher contains eligible dependent children and the assigned caregiver only.
- Selecting a child establishes a bounded actor context and asks for that child's household member code when configured.
- Selecting the caregiver invokes fresh Face ID, Touch ID, or device-passcode authentication; success exits Household Mode into the caregiver's full ordinary Kwilt.
- Cancellation or failure retains the current child context.
- Device biometrics protect caregiver re-entry; they do not identify children or prove which enrolled adult supplied the authentication.
- A caregiver viewing another member's chores on a personal device remains a caregiver view/management scope and must not be presented as acting as that child.

Household Mode also admits the selected child's own activated Arcs, Goals, and To-dos plus household-approved/shared Recipes, shared Meal Plan, and shared Groceries. Chat, Chapters, Money, and every other capability remain excluded until each has an accepted household-safe projection.

Full shared-device contract: [Caregiver-anchored Household Mode](shared-household-device-profiles.md).

### Offline contract

- Preload a bounded future occurrence window.
- Allow authorized child completion locally.
- Reconcile through an idempotent outbox retaining actor and occurrence IDs.
- Preserve explainable state for duplicate, late, or out-of-order completion/review events.

## Success signal

A child can answer “What is mine?” in To-dos, choose additional work in Chores, and complete either during a fully offline day. A caregiver sees the same eventual occurrence, performer, review, chore credit, token, streak, and Screen Time input truth after reconnection without recreating or reconciling duplicate tasks.

Observed independent child participation is required before proposing a job-flow score increase.

## Non-goals

- Automated allowance or payment, generic reward catalogs, separate Chore streaks, penalties, or rankings.
- Required photo proof or AI/photo adjudication. A child-offered photo remains optional context.
- Rotations, team chores, or chore marketplaces in the learning release.
- Claiming that Screen Time eligibility proves device enforcement.
- A new Chore domain object.
- A separate family account, household master credential, or full multi-account switcher.
- Exposing caregiver Chat, Chapters, Money, or private capability data in Household Mode.

## Learning release

The first build is a local, Kwilt-Labs-gated inventory learning release. It uses realistic simulated household members and versioned local occurrence records to evaluate the accepted hierarchy and `Take` / complete interaction in a real native bundle. It does not claim household-authorized persistence, To-dos projection, shared-device security, offline reconciliation, or Screen Time delivery.

See [Learning Release: Activity-backed Chores](../design-explorations/chores-capability/04-learning-release.md) and [Evaluate Learning: Activity-backed Chores](../design-explorations/chores-capability/05-evaluate-learning.md).

## Spec refinement

- **Chosen first-slice assumption:** simulate the child member switcher inside an authenticated local build; do not ship a fake caregiver lock.
- **Canonical seam:** every learning row has a stable Activity occurrence id and the state transitions operate on that record. The local adapter must be replaceable by household-authorized Activity projections without changing the screen contract.
- **Accepted temporary boundary:** claimed work does not enter production To-dos in this slice. The UI must not imply that it did.
- **Accepted detail contract:** row tap opens one capability-owned detail drawer; no Chores detail route is added.
- **Accepted reward contract:** chore count always exists; the local caregiver may turn the optional token program on or off, and off means no residual token UI.
- **Accepted review contract:** the learning adapter simulates a caregiver actor, capability badge, contextual review guide, one/many approval drawer, approval, and **Needs another pass**. It does not simulate caregiver authentication or production notifications.
- **Acceptance evidence:** focused domain/navigation/screen tests, product and architecture lint, diff-aware completion verification, and an operated iPhone Simulator path through Settings > Kwilt Labs > Chores.
- **Deferred user-owned decisions:** series-versus-occurrence assignment, claim expiry, production notification cadence, correction history, and real Household Mode relock remain outside this slice.

## Open questions

- How should the UI ask whether assignment applies only to today's occurrence or this and future occurrences?
- When should an abandoned shared-pool claim expire?
- Should bounded weekly availability show three slots or one chore card with `3 left`?
- How should Kwilt explain a correction that changes tokens, a backdated show-up streak, or Screen Time eligibility?
- What exact inactivity/background policy returns a temporarily unlocked caregiver account to Household Mode?
