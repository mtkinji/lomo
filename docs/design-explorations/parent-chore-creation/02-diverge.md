# Diverge: The Caregiver Chores Action Dock

## Fixed frame

All alternatives preserve the same resting caregiver dock:

```text
[ Add a chore                                  ] [Review N] [Chat]
```

- **Add a chore** is the direct path.
- **Review requests** is a conditional full-circle action immediately left of Chat.
- **Chat about chores** is the stable far-right full-circle action.
- The review action opens one submitted chore directly or several in the existing review queue drawer.
- The dock is caregiver-only. The child projection does not expose creation, Chat, or caregiver review controls.

## Axis of variation

**When and where does an unstructured household need become a structured, household-visible Chore?**

The alternatives vary the commitment model:

1. Structure before save in one native drawer.
2. Capture privately first, then clarify progressively.
3. Let Chat prepare a proposal, then open the native Chore editor.
4. Create and refine a private draft directly in the inventory.

## Alternative A: One Native Chore Drawer

Tapping **Add a chore** directly reuses the existing To-do `QuickAddDock`. Submitting the title opens one Chores-owned **New chore** editor drawer: **For**, **Available**, and **Add chore** are visible; **What done means**, **Review**, and token value progressively disclose below. This is the actual editable creation surface, not a preview or confirmation drawer. The chore becomes household-visible only when the caregiver taps **Add chore**. Contextual Chat may ask a clarifying question or prepare a draft, but its proposal opens this exact same editor with proposed values filled in and visibly attributed to Chat until the caregiver edits or saves them.

```text
Add a chore -> type title -> native draft drawer -> Add chore -> inventory receipt
Chat -> proposed chore -> same New chore editor -> Add chore -> inventory receipt
```

- Audience/persona fit: strong for Maya because direct capture remains familiar and the household consequence is reviewed in one bounded place.
- Design-challenge answer: turns a passing need into a reusable responsibility quickly while keeping responsibility and timing explicit before publication.
- System fit: strong. Reuses the Quick Add dock behavior, Canonical Bottom Drawer geometry, Chores-owned policy fields, Chat proposal handoff, and Activity-backed save boundary.
- Smallest system extension: a Chores draft schema and native drawer that both entry paths can populate.
- Best when: most chores need only a title, one participant choice, and one plain-language availability choice.
- Fails when: the drawer exposes recurrence vocabulary, household expectations, Screen Time, or every optional policy at once and becomes a generic task form.
- Primer anti-pattern check: pass. Capture remains unanchored from Arcs/Goals, Chat does not own truth, there is no dashboard, streak pressure, forced commitment, or default-public sharing.

## Alternative B: Private Capture, Contextual Clarification

Submitting **Add a chore** immediately retains a private caregiver draft and returns Maya to the inventory with a compact receipt: `Laundry is saved as a draft · Finish setup`. The chore is not visible to children and creates no occurrences yet. Opening **Finish setup** asks one decision at a time—first **For**, then **Available**—and publishes only after the minimum contract is complete. Chat can also retain a private draft and point to the same next unanswered decision. Drafts appear in a small caregiver-only **Drafts** group at the top of Chores until completed or discarded.

```text
Add a chore -> type title -> private draft receipt -> answer next decision -> Publish
Chat -> private draft -> same next-decision flow -> Publish
```

- Audience/persona fit: mixed-to-strong. It protects capture during interruption, but Maya may inherit a new queue of unfinished setup.
- Design-challenge answer: removes the risk of losing the thought while ensuring an incomplete chore never reaches a child.
- System fit: medium. It follows capture-first philosophy but adds a durable private Chore-draft lifecycle, draft inventory projection, cleanup behavior, and recovery rules.
- Smallest system extension: persistent private drafts with explicit non-participation in Activity occurrences until publication.
- Best when: caregivers frequently capture chores while interrupted and cannot answer participant or timing questions in the moment.
- Fails when: drafts accumulate, “finish setup” becomes nagging admin, or the app makes a saved draft feel equivalent to a real family agreement.
- Primer anti-pattern check: caution. It preserves capture-first behavior and privacy, but risks a pending-decisions queue and productivity-app maintenance. The fix would require drafts to be quiet, easily discarded, and never counted as work.

## Alternative C: Conversational Chore Builder

The direct path remains a minimal title capture, but the primary refinement experience is contextual Chat. A parent can say, `The kids should take turns feeding Pepper every morning`, and Chat responds with one concise proposed chore card showing **For**, **Available**, **What done means**, and review behavior. Tapping **Edit in Chores** opens the actual native editor drawer; Chat itself never publishes. Directly captured titles may offer **Shape this with Chat** when the chore lacks enough detail.

```text
Chat -> ordinary-language request -> proposed chore card -> native editor -> Add chore
Direct title -> Shape this with Chat -> proposed card -> native editor -> Add chore
```

- Audience/persona fit: strong when Maya naturally describes the household problem in a sentence; weaker when she wants to add `Empty dishwasher` and move on.
- Design-challenge answer: lets the parent express household intent without learning Kwilt's participation and availability model.
- System fit: medium. It fits Unified Chat's reviewed-write architecture but Chores currently has no household-authorized read/write tools, so the native capability contract must exist before Chat can participate.
- Smallest system extension: Chores draft proposal schema, bounded context provider, staged native client action, and explicit operation coverage.
- Best when: the intended chore contains implied recurrence, rotation, or ambiguity that natural language can clarify more gracefully than fields.
- Fails when: Chat asks too many questions, invents family policy, becomes required for ordinary creation, or makes a proposal look already applied.
- Primer anti-pattern check: caution. It passes only if Chat remains non-anthropomorphic, uses bounded household context, stages reviewable proposals, and never silently assigns or publishes.

## Alternative D: Draft Row In Place

Tapping **Add a chore** inserts a caregiver-only draft row at the top of the inventory and focuses its title. The row expands in place to show compact **For** and **Available** controls; optional details open a drawer. Saving turns that exact row into the live Chore definition without a separate confirmation surface. Contextual Chat can prepare an identical draft row with a visible `Suggested` state, and the caregiver edits or saves it in place.

```text
Add a chore -> editable draft row -> set For/Available -> Save in place
Chat -> suggested draft row -> edit/Save in place
```

- Audience/persona fit: potentially strong because the result appears where it will live, but inline editing may make the quiet child-readable inventory feel like an adult management table.
- Design-challenge answer: minimizes navigation and makes the before/after relationship concrete.
- System fit: medium-to-low. It reuses inventory rows visually but requires a distinct editable row anatomy, keyboard-safe list choreography, draft filtering, and strict child/caregiver projection boundaries.
- Smallest system extension: an editable caregiver-only draft-row state backed by the same Chores draft schema.
- Best when: the inventory is short and a caregiver benefits from seeing surrounding chores while deciding whether to duplicate or differentiate one.
- Fails when: the row becomes cramped, the keyboard hides context, draft controls weaken scanning, or children briefly see unpublished state.
- Primer anti-pattern check: caution. It avoids a separate dashboard, but can turn the inventory into a configurable table. It passes only if the row remains singular, temporary, and absent from every child projection.

## Cross-alternative review action

The conditional review circle does not vary across these creation alternatives:

- It represents child-initiated submissions waiting for caregiver action, not overdue chores or inferred noncompliance.
- Its badge is a factual count without urgency color or shame language.
- One item opens directly to the review detail; several open the scroll-safe queue.
- Approve and **Needs another pass** preserve performer and performance time.
- Resolving the last request removes the circle only after the drawer closes; Chat remains anchored at the far right.
- It replaces the Chores-screen `BottomGuide`; the capability-menu badge remains the signal when the caregiver is elsewhere.

## Divergence summary

| Alternative | Fast capture | Household consequence clarity | System fit | Admin risk | AI dependence |
| --- | --- | --- | --- | --- | --- |
| A. One Native Chore Drawer | Strong | Strong | Strong | Low | Low |
| B. Private Capture, Contextual Clarification | Strongest | Strong before publish | Medium | High | Low |
| C. Conversational Chore Builder | Mixed | Strong if proposal is clear | Medium | Medium | High |
| D. Draft Row In Place | Strong | Medium | Medium-low | Medium | Low |

No alternative makes expectations, Screen Time, token redemption, household membership, or rotation part of the single-chore creation flow. Those remain separate decisions reached after a real Chore exists.
