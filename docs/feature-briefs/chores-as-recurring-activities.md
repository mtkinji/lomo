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
- Assignment, open-pool eligibility, availability, photo policy, and approval policy inherited from the series with explicit occurrence overrides.
- Completion of one occurrence never completes future occurrences.
- Reassign today versus this and future occurrences is explicit.
- Schedule/time-zone changes have deterministic occurrence behavior.
- Chore recurrence can express daily, once-weekly, bounded-repeat, cooldown, and manual availability without copying one checkbox.
- Repeating chores use one of two explicit one-copy outcomes. **Start fresh next time** closes an unfinished scheduled occurrence as missed when its window passes and materializes the current or next valid occurrence without backfilling. **Keep open until done** preserves one actionable occurrence and schedules the next relative to completion. The caregiver sees this progressive choice only when a chore repeats. Multiple owed copies remain unsupported.
- One occurrence may be projected into Chores and To-dos, but it retains one identity and completion history.

### Completion policy

- **Trusted completion:** local completion immediately becomes qualifying truth unless later corrected through explicit history.
- **Caregiver review:** the child submits completion; the occurrence remains **Waiting for approval** until an authorized caregiver approves or returns it for rework.

Returning work uses the child-legible state **Needs another pass**, not rejection language. The original performer and performance time remain attached to the occurrence. An approval records the reviewing caregiver and review time but qualifies the original performance fact.

Review is a Chore policy on the Activity series or occurrence, not a universal Activity requirement. Approval qualifies the original performer and performance time, not the caregiver or approval time.

A root chore independently configures whether a photo is **Optional** or **Required** and whether caregiver approval is **Not required** or requires **Caregiver approval**. These policies compose: a required photo gates the child's finish action until an image is attached, while approval alone determines whether that action completes immediately or enters `Waiting for approval`. Camera and photo-library images both satisfy the first-release photo requirement; Kwilt calls this photo evidence rather than verified proof and performs no automated judgment. Existing chores migrate to **Optional** photo and **Not required** approval unless already configured otherwise. In review, the submitted photo and a compact performer identity pill replace explanatory authorship copy.

One qualifying completion:

- contributes one occurrence to chore progress unless the household explicitly chooses token-weighted criteria;
- advances the performing child's existing Kwilt show-up streak once for the local performance day;
- appends the configured token earning; and
- may become a Screen Time input fact without claiming that device enforcement changed.

### Surfaces

- Chores is a direct capability in the main capability menu rather than a subsection of To-dos.
- Chores uses the quiet inventory grammar of Groceries and To-dos: a simple header, grouped shared rows, direct completion, and no dashboard chrome.
- The caregiver inventory is a list of stable chore series, not a list of today's occurrences. Tapping a caregiver row opens the full-height root chore editor immediately, with title, assignee, recurrence, definition of done, independent **Photo** and **Approval** policies, and optional reward ready to modify. Saving changes the series used to generate future occurrences and never rewrites completed occurrence receipts.
- Child rows remain occurrence projections. Their detail drawer owns completion, evidence, approval state, and the truthful receipt for that specific performance. A later **Recent activity** disclosure may expose series-scoped occurrence history, but history must remain secondary to root-chore management and must not turn the caregiver inventory into a performance dashboard.
- The child-facing sections are **My chores** for assigned/claimed occurrences and **Choose a chore** for currently available open work with a direct **Take** action.
- To-dos continues to present personal Activity responsibility and canonical occurrence completion.
- An assigned chore occurrence appears in the child's To-dos.
- An open-pool chore remains in Chores until the child claims it; the claimed occurrence then also appears in their To-dos.
- Mere eligibility for the pool does not flood To-dos with every household chore.
- **Assigned to me** appears only after inbound assigned work exists and auto-hides when empty.
- Assigning a recurring Activity to a child removes its daily occurrences from the creator's personal views; the caregiver inspects them through the authorized child/member scope.
- Chores presents assigned chores, the shared pool, take/return lifecycle, review state, qualifying chore facts, and optional digital rewards.
- Tapping a chore row opens one detail drawer rather than a full detail route. Attempting completion from the row opens that same taller drawer without changing state. The canonical compact drawer header contains only the chore title and standard close action; eligibility, assignment, and status never appear as a header subtitle. Before completion, the body shows who may do the chore, a concise definition of done, meaningful timing, optional token value, and an easy **Take a photo** affordance before one explicit **Mark done** or **Submit for approval** action. When a photo is required, the drawer says **Add a photo to finish this chore** and disables the finish action until evidence is attached. For approval-required work, only that explicit submission shows `Waiting for approval`; caregiver approval produces the checked completed state and completion credit. A completed drawer becomes a truthful receipt: the performer avatar pill, completion time, approval time and caregiver when applicable, and **Earned** token language replace eligibility and future-tense reward copy. Evidence uses a full-width 4:3 landscape frame by default; tapping it opens a dedicated full-screen, pinch-to-zoom photo viewer whose close action is a transparent high-contrast overlay rather than a light button on the dark media surface. A genuinely completed check remains reversible from the row.
- Chore completion is a universal fact, but an expectation count exists only when the household has configured one. The child inventory does not add a fixed agreement or progress surface: **My chores** and **Choose a chore** already identify the available work. No active expectation means no progress language.
- The distinction between `Choose 3 more by Friday` and `3 chores left by Friday` is data-backed: the first is scoped to open-pool choices, while the second allows any qualifying chore. Kwilt never infers whether assigned work counts toward a quota.
- **Use digital rewards** is a household-level Labs program and is off by default. When disabled, token values, balances, token vocabulary, and token iconography disappear completely. When enabled, row metadata states `2 tokens`, and one circular Rewards wallet action opens the child's available, set-aside, and total token balances. In Chore settings, a caregiver sets the household's **Dollars per token** value; the learning release defaults to $0.50. A child may set available tokens aside at the current household rate. Each reservation captures its rate, so later setting changes affect the available cash equivalent and future redemptions without changing pending or settled payout receipts. Reserved tokens remain visibly the child's and may be cancelled while unpaid. Only the caregiver's **Paid** action, taken after an outside-app payout, permanently redeems them. The caregiver Rewards action carries attention when a payout is waiting, separately from chore-review judgment.
- A claimed open-pool row uses a quiet ellipsis menu containing the neutral minus-icon **Return to family list** action. It is reversible, never destructive, and returns the occurrence to **Choose a chore** with a brief Undo path.
- Caregiver attention stays capability-owned. When at least one child submission or correction needs a caregiver response, Kwilt shows its standard red attention treatment in three progressively specific places: the OS app-icon badge, the caregiver-only Chores count badge in the capability menu, and one count-free red dot over the Chores **Review requests** action. The numbered badges equal the number of unresolved requests in the caregiver's Chores review queue and decrement as those requests are resolved; ordinary overdue To-dos and informational reminders do not contribute. The review action opens the single Chores-owned review drawer. Child Household Mode never exposes caregiver review counts or controls. The app-icon badge requires Chores Labs, a signed-in caregiver context, enabled app notifications, and authorized OS notification permission; it adds no banner or sound.
- One pending approval opens directly to its review detail. The title remains alone in the header; the submitted photo, when present, is the dominant review evidence and a compact avatar/name pill identifies the child below the chore criteria. Several approvals open a scroll-safe queue; each item can be approved directly or opened in the same drawer for **Needs another pass**. The primary **Approve** action includes a checkmark. The first slice does not include blind bulk approval.
- The child sees only currently relevant occurrences, not future copies of the recurrence series.
- A missed occurrence remains history, never completion credit, token earning, streak credit, quota progress, or a Screen Time input fact.
- If a child did assigned recurring work but did not record it, the current occurrence's detail drawer reveals a quiet correction entrance only when that series has missed occurrences in the current calendar week. One eligible yesterday reads **I did this yesterday**; several eligible dates read **I did this on another day**. The child may select several real missed dates and ask a caregiver to count them. Each date becomes its own correction request in the existing caregiver review queue. **Count it** changes only that missed occurrence into a dated completion receipt and applies its credit exactly once; **Leave as missed** restores the miss. Correction never invents an exact performance time, completes today's chore, advances recurrence, or supports blind bulk approval.
- Adult personal To-dos receives no chore chrome merely because a Household exists.
- No household KPI dashboard, Chore-specific streak, score, ranking, or overdue shame.

### Caregiver creation

The caregiver Chores inventory owns one bottom action region:

- the existing To-do `QuickAddDock` component with **Add a chore** copy;
- a conditional full-circle **Review requests** action when child submissions are waiting; and
- a stable far-right **Chat about chores** action.

Submitting the direct composer does not insert an Activity or Chore into the inventory. It immediately opens the actual full-height **New chore** editor drawer with the entered text retained. This is the creation surface, not a preview or confirmation step. Its keyboard-aware body scrolls behind one fixed **Add chore** footer; **Add chore** is the first commit that creates the local or production Chore definition and its Activity/occurrence behavior.

The editor requires only:

- **Chore** — child-readable title;
- **For** — one named household member or **Household**; and
- **Repeats** — the existing To-do recurrence system, presented as **One time**, **Daily**, **Weekdays**, **Weekly**, **Monthly**, **Yearly**, or **Custom…**.

**What done means**, trusted versus caregiver-reviewed completion, and token value are progressively disclosed. Token value is absent when the household token program is off. Expectations, Screen Time criteria, token-program setup, rotation, reminders, priority, estimates, tags, Goals, and Arcs do not enter single-chore creation.

The direct dock reuses the existing Quick Add AI operations for steps, triggers, and details, expressed in Chores as **Add steps**, **Set a routine**, and **Clarify done**. While enrichment runs, the editor remains fully usable and shows the canonical Kwilt loading spinner with **Adding details…**. AI fills only untouched fields. A caregiver edit wins immediately; dismissing or saving invalidates late results. AI may extract explicit participant and recurrence language but may not invent an assignee, recurrence, token value, review requirement, photo evidence, or Screen Time consequence. Missing participation defaults visibly to **Household** and missing recurrence defaults visibly to **One time**.

The caregiver projection is one flat routine inventory rather than a completion log or permanent child-by-child grouping. Its quiet scope filter uses the shared To-dos inventory-control rail treatment while retaining a simplified picker offering **All chores**, each child, and **Household**; Chores does not expose unsupported Sort or Group actions. Every row begins its metadata with one compact assignee pill: a named child uses the shared `ProfileAvatar` and name, while **Household** uses the same pill silhouette with a house mark. Missing-photo avatars use a flat, muted Kwilt brand surface and the first two letters of the first name so children who share an initial remain distinguishable. Completed occurrences continue to show the routine cadence, while **Waiting for review** and **Needs another pass** replace cadence only when caregiver action is useful. Completion receipts and history remain in chore detail.

Contextual Chat may discuss a broader household situation and prepare a typed Chore draft only after Chores has an explicit capability contract. Its **Edit in Chores** action opens this same editor; Chat never commits the chore. Until that handoff exists truthfully, contextual Chat remains discussion-only and must not claim that it created, assigned, or scheduled work.

The conditional review action replaces the caregiver-only floating guide inside Chores. One request opens directly to the existing review detail; several open its queue. The capability-menu badge remains the out-of-capability attention signal. Child projections expose none of the caregiver dock, AI loading, draft state, Chat context, or review controls.

Detailed contract: [Caregiver Chores Action Dock And Editor](../design-explorations/parent-chore-creation/06-ui-contract.md).

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

The current build is a local, Kwilt-Labs-gated inventory and digital-rewards learning release. It provides **My chores** / **Choose a chore**, direct **Take**, a secondary **Return to family list**, an append-only token ledger, child reservation/cancellation, and caregiver-recorded outside-app settlement. It uses realistic simulated household members and versioned local records. It does not claim household-authorized persistence, shared-device security, offline reconciliation, Screen Time delivery, or in-app money movement.

See [Learning Release: Child-readable Chore Agreement](../design-explorations/chores-capability/04-learning-release.md) and [Evaluate Learning: Child-readable Chore Agreement](../design-explorations/chores-capability/05-evaluate-learning.md).

## Spec refinement

- **Chosen first-slice assumption:** simulate the child member switcher inside an authenticated local build; do not ship a fake caregiver lock.
- **Canonical seam:** every learning row has a stable Activity occurrence id and the state transitions operate on that record. The local adapter must be replaceable by household-authorized Activity projections without changing the screen contract.
- **Accepted temporary boundary:** claimed work does not enter production To-dos in this slice. The UI must not imply that it did.
- **Accepted detail contract:** row tap opens one capability-owned detail drawer; no Chores detail route is added.
- **Accepted expectation contract:** a versioned learning expectation stores assigned-work cadence, optional quota scope and threshold, explicit deadline copy, and optional benefit copy as independent facts. The UI projects these facts and never reverse-engineers a time window from row count.
- **Accepted reward contract:** the local caregiver may turn digital rewards on or off; off means no residual token UI. When on, the append-only ledger projects total, available, and set-aside balances. A child reservation never removes ownership; child cancellation releases it; caregiver-recorded payment atomically settles the payout and redeems the reserved tokens.
- **Accepted action contract:** `Take` directly claims available open work. A claimed row's quiet ellipsis progressively discloses `Return to family list`, which reverses only a current claim and is paired with a neutral minus icon and Undo.
- **Accepted bottom-surface contract:** the child has no fixed agreement bar. When digital rewards are enabled, a single circular wallet action opens the Rewards drawer; the chore inventory remains the first focal point.
- **Accepted review contract:** the learning adapter simulates a caregiver actor, numbered app-icon and capability-menu badges, red review-action dot, one/many approval drawer, approval, and **Needs another pass**. The app-icon badge mirrors the unresolved caregiver review count while the app runs; it does not simulate caregiver authentication, background push delivery, a notification banner, or sound.
- **Accepted caregiver-dock contract:** the caregiver projection directly reuses `QuickAddDock` for **Add a chore**, places conditional **Review requests** and enabled **Rewards** circles immediately left of the stable far-right Chat circle, and removes the separate Chores `BottomGuide`. The child receives only the Rewards circle when the Labs program is enabled.
- **Accepted editor contract:** direct submit opens the actual **New chore** editor immediately and does not add anything to the inventory. The editor remains editable while the canonical loader shows **Adding details…**; asynchronous enrichment may fill only untouched fields. **Add chore** is the first commit.
- **Accepted recurrence contract:** Chores directly reuses the To-do recurrence types, labels, preset/custom editor, and one-active-occurrence lifecycle. **Start fresh next time** is the scheduled default; **Keep open until done** uses completion-relative recurrence. Trusted completion advances immediately; review-required completion advances only after caregiver approval. Missed copies do not pile up, and missed scheduled work is reconciled without credit.
- **Accepted AI-authoring contract:** Chores reuses the existing steps/triggers/details enrichment boundary, ignores unrelated To-do enrichment fields, uses visible **Household** and **One time** fallbacks, and never lets AI invent household consequences. Save or dismissal invalidates late results.
- **Accepted contextual-Chat boundary:** the dock may open truthful Chores context for discussion, but a typed **Edit in Chores** draft handoff remains unavailable until it has an explicit operation/capability contract. The Labs release must not fake or imply that handoff.
- **Acceptance evidence:** focused domain and screen tests for expectation composition and state transitions, product and architecture lint, diff-aware completion verification, and an operated iPhone Simulator path through Settings > Kwilt Labs > Chores.
- **Acceptance evidence for caregiver creation:** focused pure tests for draft defaults, explicit member/recurrence inference, enrichment mapping, touched-field protection, caregiver-only publication, and persisted migration; component tests for dock visibility, immediate editor opening, loading state, save/dismiss races, child projection, and review action; real Simulator operation of the loading and failure states.
- **Deferred user-owned decisions:** series-versus-occurrence assignment, claim expiry, production notification cadence, correction history, real Household Mode relock, batch Chat creation, and production Chat draft handoff remain outside this slice.

## Open questions

- How should the UI ask whether assignment applies only to today's occurrence or this and future occurrences?
- When should an abandoned shared-pool claim expire?
- Should bounded weekly availability show three slots or one chore card with `3 left`?
- How should Kwilt explain a correction that changes tokens, a backdated show-up streak, or Screen Time eligibility?
- What exact inactivity/background policy returns a temporarily unlocked caregiver account to Household Mode?
