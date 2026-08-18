# Learning Release: AI-Enriched Caregiver Chore Creation

## Concept To Build

Add a caregiver-only Chores action dock that directly reuses the existing To-do `QuickAddDock`, opens the actual **New chore** editor instead of inserting the submitted item into the list, lets AI fill untouched fields while the parent edits, and commits to the local Chores inventory only when the parent taps **Add chore**. Contextual Chat opens the same editor, and child submissions remain reachable from the same dock.

## Capability Delta

Today, the user cannot:

- create or edit the Chore definitions used by the Labs learning inventory;
- type a simple chore description and receive proposed child-readable steps or recurrence;
- enter contextual Chat from Chores and return with a typed Chore draft;
- confirm who may do a chore before it reaches the child projection; or
- reach the existing child-submission review drawer from a dock-owned review action.

After this release, the user can:

- create one local Chore from the caregiver Chores screen;
- use real bounded AI enrichment to propose **Steps**, **Repeat**, and **Details** from the entered language;
- begin editing immediately in one native **New chore** drawer with no preview or confirmation surface before it;
- publish the Chore into the local Activity-occurrence learning adapter;
- ask contextual Chat to prepare one local Chore draft and return to the same native editor drawer; and
- open one or several pending child submissions from a conditional dock circle.

Still intentionally not supported:

- production Household reads, writes, authorization, or persistence;
- production To-dos projection or occurrence sync;
- child authentication or caregiver re-entry;
- batch Chat creation, rotations, automatic fairness, or collaborative chores;
- expectation authoring, Screen Time policy, token-program setup, or redemption;
- production notifications, offline reconciliation, or durable correction history; and
- any claim that the local Chore changes a real child's experience outside the Labs fixture.

## User Experience

An authorized caregiver opens **Settings > Kwilt Labs > Chores** and sees the quiet Chores inventory with one bottom action region:

```text
[ Add a chore                                  ] [Review N] [Chat]
```

### Direct happy path

1. Tap **Add a chore**.
2. Type `Charlie feeds Pepper every weekday morning` in the familiar under-keyboard composer.
3. Leave the chore-specific AI actions **Steps**, **Repeat**, and **Details** selected and submit.
4. Submit opens the native **New chore** editor immediately. Nothing is inserted into the inventory.
5. The parent may edit immediately while real enrichment fills only untouched fields. The editor contains:
   - title: `Feed Pepper`;
   - **For**: `Charlie`, proposed only because the input named one unambiguous fixture member;
   - **Available**: `Weekday mornings`;
   - a concise definition of done;
   - **Completion**: the local household default; and
   - token value only when tokens are enabled.
6. Edit any field and tap **Add chore**.
7. The drawer closes, the new local occurrence appears in the appropriate caregiver/child projection, and a receipt says `Chore added for Charlie · View · Undo`.

If AI enrichment fails, the drawer still opens with the exact input as the title, **For Household**, and **As needed**. The caregiver can complete the draft manually; capture is never lost.

### Contextual Chat happy path

1. Tap the stable far-right Chat circle.
2. Unified Chat opens with visible, removable **Household** and **Chores** learning context plus an exact return target.
3. Ask `Help me make clearing the dinner table clear enough for the kids to do without asking me what counts.`
4. Chat stages one typed local Chore proposal; it does not publish or mutate the inventory.
5. Tap **Edit in Chores** on the proposal.
6. Return to Chores with the same native **New chore** editor populated and immediately editable.
7. Edit or publish through **Add chore**.

### Review-request happy path

1. A simulated child submits a review-required Chore.
2. The caregiver dock gains a full-circle review action with a factual count.
3. One request opens directly to detail; several open the existing scroll-safe queue.
4. **Approve** or **Needs another pass** resolves the occurrence while preserving the simulated performer and performance time.
5. Resolving the final request removes the review circle after the drawer closes. Chat remains anchored at the far right.

## Existing Product Relationship

This release enhances the existing Labs-gated Chores inventory rather than adding another destination. It reuses:

- the existing To-do `QuickAddDock` component itself, including resting, keyboard, AI-action, and capture behavior;
- Canonical Bottom Dock Geometry;
- the existing Chores member projection and local Activity-occurrence adapter;
- the current Chore detail and caregiver review drawers;
- Unified Chat's contextual launch, typed proposal, native handoff, and exact-return patterns; and
- the capability-menu Chores badge as the out-of-capability attention signal.

It replaces the caregiver-only floating review guide with the conditional dock circle. It does not change the child completion surface except that newly created local occurrences can appear there for learning.

## Buildable Slice

Must be real:

- A caregiver-only Chores dock composed from existing floating-dock surfaces with:
  - an embedded **Add a chore** composer;
  - a conditional **Review requests** circle and numeric badge; and
  - a stable far-right **Chat about chores** circle.
- A Chores-owned draft type that keeps source text, proposed fields, proposal provenance, and caregiver-confirmed state separate from published local records.
- A Chores submit adapter around the existing `QuickAddDock` that reuses its presentation and AI-action controls but does not invoke the To-do controller's immediate list commit.
- Shared draft-building and AI-enrichment seams extracted from the current To-do Quick Add controller rather than copied into Chores.
- Deterministic safe fallbacks: **For Household**, **As needed**, exact entered title, no invented reward, and no invented review requirement.
- A native **New chore** editor drawer with required **Chore**, **For**, and **Available** fields plus progressive **What done means**, **Completion**, and conditional token value. It opens immediately on dock submit and is the only pre-save surface.
- Field-level touch tracking so asynchronous AI results populate only untouched fields; dismissing or saving cancels or ignores late results.
- Local publication into stable Activity definition and occurrence identities, with the new occurrence visible through the existing child and caregiver projections.
- A local undo that removes or retires only the just-created Labs record and never touches unrelated fixtures.
- Contextual Unified Chat launch with visible learning context, exact return, one typed Chore-draft proposal, and native editor handoff.
- Explicit Chat operation coverage marking the proposal as Labs-local and reviewed; Chat never owns the publish action.
- The conditional review circle opening the current one/many review drawer and replacing `BottomGuide` attention inside Chores.
- Keyboard, safe-area, Dynamic Type, VoiceOver labeling, Reduce Motion, and child/caregiver projection tests proportionate to the new state.

Can be thin or temporary:

- Chore definitions, draft proposals, and occurrences may persist only in the existing local Labs store.
- Household members may remain the realistic Charlie, Olive, and caregiver fixtures.
- The AI enrichment adapter may consume only the draft text and fixture member names; it does not need production Household retrieval.
- Availability may support only **As needed**, **Every day**, **Weekdays**, **Every week**, and a bounded **A few times a week** in the first build.
- **After it was last done** may be visible only if the local occurrence adapter can represent it truthfully; otherwise exclude it from this slice.
- Contextual Chat may stage one proposal per turn and open one proposal at a time in the native editor.
- Receipt and undo may be local-only and short-lived.

Intentionally excluded:

- A caregiver draft queue or unfinished-draft inventory.
- Editable draft rows inside the Chores list.
- Generic recurrence, due-date, reminder, priority, estimate, tag, Goal, or Arc fields.
- Templates, starter catalogs, bulk creation, or AI-generated household programs.
- Rotations, swaps, team chores, fairness scoring, or automatic assignment.
- Child **I need help** requests; the first review circle contains completion submissions only.
- Red alerts, overdue counts, missed-expectation alerts, or any household KPI surface.
- AI-generated token values, Screen Time consequences, or evidence requirements.
- Production schema migrations, Supabase policies, push notifications, shared-device security, and offline sync.

## Release Channel

**Local build**, gated behind **Kwilt Labs**.

This is the fastest channel that can exercise the real keyboard dock, native drawers, existing AI enrichment, contextual Chat handoff, member projection, and review queue without presenting simulated household data as a production capability. The learning requires a bundled iOS experience; a static mock or isolated component story cannot establish whether the three dock actions remain clear and reachable in use.

The intended proof device is the iPhone 17 Pro / iOS 26.5 Simulator already used for the Chores child-flow evaluation. Physical-device, TestFlight, production backend, and real two-account household proof remain separate promotion gates.

## Brand-Goodwill Guardrails

- The entire surface remains behind the existing Kwilt Labs opt-in.
- The Labs description states that Chores uses local sample household members and does not affect a real household, Screen Time, allowance, or production To-dos.
- Chat proposal copy says **Edit in Chores** and never **Created**, **Assigned**, or **Scheduled** before native publication succeeds.
- AI-proposed fields use one quiet provenance note: `Suggested from what you wrote · Review before adding`.
- AI failure degrades to a complete manual draft rather than an error loop or lost capture.
- Child projections never show caregiver creation controls, contextual Chat, review counts, unpublished drafts, or AI provenance.
- Review attention uses a neutral count and child-request language, not urgency, failure, or compliance language.

## Reversibility

The release remains isolated behind the Chores Labs gate and the existing local store. Removing the dock, Chores draft adapter, and Labs-only Chat operation leaves no production Household records, migrations, notifications, or entitlements. The published local Chore continues to use stable Activity identities so the UI can be iterated without redefining completion state, but the entire local fixture namespace can be reset through the existing Labs reset path.

The contextual Chat operation must be declared unavailable outside the Labs-local mobile provider. Removing it cannot strand a production proposal or imply that any household mutation occurred.

## Permanent Product Threshold

Promote this into production capability only when observed caregiver use shows that:

- a parent can distinguish direct Quick Add, review requests, and contextual Chat from the resting dock without instruction;
- one ordinary sentence usually yields a correct or cheaply corrected title, participation proposal, availability, and definition of done;
- the caregiver understands that review is required before the chore reaches a child;
- the child can understand and complete a newly authored chore without extra caregiver translation;
- the review circle feels like responding to a child, not monitoring compliance; and
- the product has real household-authorized Activity/Chore persistence, typed Chat proposal authority, caregiver identity, and deterministic occurrence behavior ready for a separate production release.
