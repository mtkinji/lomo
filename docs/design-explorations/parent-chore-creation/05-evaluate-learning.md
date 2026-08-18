# Evaluate Learning: AI-Enriched Caregiver Chore Creation

## Learning questions

### Dock comprehension

1. Can a caregiver distinguish **Add a chore**, conditional **Review requests**, and **Chat about chores** at a glance?
2. Does the conditional review circle feel like responding to a child's submitted work rather than monitoring compliance?
3. When the review circle appears or disappears, do the direct composer and far-right Chat action remain spatially understandable?

### Creation-boundary comprehension

4. After submitting text in Quick Add, does the caregiver understand that **New chore** is the actual editor and that nothing has been added yet?
5. Is **Add chore** understood as the first household-visible commit without requiring an extra confirmation step?
6. Can the caregiver dismiss the editor without wondering whether an Activity, occurrence, assignment, or draft was left behind?

### AI usefulness and trust

7. Does AI turn a simple sentence into useful child-readable title, steps, and availability often enough to reduce setup work?
8. Does the caregiver understand which structure came from what they wrote without needing per-field AI badges?
9. Can the caregiver begin editing immediately while AI enrichment is still running without fields jumping, reverting, or becoming disabled?
10. When the caregiver edits a field before AI responds, does the field remain exactly as edited?
11. When input contains no timing cue, does **As needed** feel truthful rather than incomplete?
12. When input names a household member, does the proposed **For** value feel expected and easy to correct?
13. When AI fails or is unavailable, does the exact captured text still produce a usable manual editor rather than a broken or diminished flow?

### Direct versus Chat entry

14. Do caregivers use direct Quick Add for concrete chores and contextual Chat for broader or ambiguous household situations without being taught that division?
15. Does **Edit in Chores** make it clear that Chat prepared a starting point but did not create, assign, or schedule anything?
16. Does returning from Chat to the same native editor feel like one system rather than a handoff between unrelated tools?

### Parent-to-child continuity

17. Can a caregiver accurately explain who will see the chore and when it will appear before tapping **Add chore**?
18. Does the published item appear in the correct local caregiver and child projections with one stable Activity/occurrence identity?
19. Can the child understand what to do, when it is available, and whether completion needs review without additional caregiver explanation?
20. Does a correction in **What done means** improve the child's next attempt without erasing the original performance or turning feedback into blame?

## Scenarios to exercise

Use a small set that stresses different inference boundaries:

1. **Bare title:** `Empty the dishwasher`
   - Expected: title retained or lightly cleaned; **For Household**; **As needed**; useful optional steps; no invented child or recurrence.
2. **Explicit person and recurrence:** `Charlie feeds Pepper every weekday morning`
   - Expected: Charlie proposed; weekday-morning availability; concise child-readable completion guidance.
3. **Explicit sequence:** `Wipe the table after dinner and put the cloth in the hamper`
   - Expected: readable title plus steps; no invented named assignee, reward, or review policy.
4. **Review request:** `Olive cleans the bathroom every Saturday and I want to check it before it counts`
   - Expected: Olive, weekly availability, caregiver review, no mandatory photo evidence.
5. **Noisy or ambiguous language:** `We keep forgetting the trash`
   - Expected: conservative draft with ambiguity visible; no silent recurrence, assignment, or fairness policy.
6. **Contextual Chat:** `School mornings are chaotic. Help me find one responsibility Charlie could own.`
   - Expected: discussion may use bounded context; one typed proposal; **Edit in Chores**; no direct publication.
7. **AI failure:** repeat a representative direct capture with enrichment unavailable.
   - Expected: exact input, immediate editable drawer, safe defaults, and successful manual add.
8. **Edit race:** change **For**, **Available**, and **What done means** before delayed enrichment returns.
   - Expected: every touched field remains unchanged; only untouched fields may fill.

## Supporting evidence

Evidence supporting the bet includes:

- the caregiver correctly states that the chore does not exist until **Add chore**;
- direct submit opens the editor immediately with no transient inventory row;
- the caregiver begins editing without waiting for enrichment;
- AI-proposed recurrence matches explicit timing language and stays **As needed** when timing is absent;
- no AI response overwrites a touched field or mutates after dismissal/save;
- most proposed titles and definitions of done require no change or one small change;
- the caregiver can predict the child projection before publishing;
- the child can act from the resulting title and definition of done without the parent restating it;
- direct Quick Add remains the natural path for a concrete chore while Chat is chosen for broader framing;
- one/many review requests are reached without the former floating guide; and
- the review count is described as work the child handed back, not a measure of failure.

Technical evidence supporting feasibility includes:

- one shared `QuickAddDock` implementation renders both To-do and Chores capture without component forks;
- the To-do path still commits directly to To-dos while the Chores adapter opens the editor without committing;
- direct and Chat entry produce the same versioned Chores draft shape;
- one local published Chore creates stable definition and occurrence identities;
- child and caregiver projections resolve the same occurrence state;
- field-touch arbitration is deterministic under delayed, failed, duplicated, and late AI responses; and
- dismiss, save, undo, member switch, relaunch, and Labs reset leave no orphan drafts or late mutations.

## Disconfirming signals

The bet is weakened or disproven if:

- caregivers believe Quick Add already created the chore before **Add chore**;
- the drawer feels like a second confirmation screen rather than the place where creation happens;
- caregivers wait passively for AI because the editor appears locked or unfinished;
- fields jump after the caregiver edits them;
- AI invents recurrence, assignees, token values, review requirements, or consequences;
- **As needed** causes repeated uncertainty for title-only chores;
- caregivers routinely open Chat for chores that direct capture should handle, or avoid Chat even for ambiguous household framing;
- the Chat proposal and native editor disagree about the chore's important facts;
- the resulting child row still requires the caregiver to explain what “done” means;
- the review circle is interpreted as overdue work, misbehavior, or a parental notification inbox;
- adding the second circle compresses the Quick Add field below a comfortable phone width or causes keyboard/safe-area collisions; or
- local Activity identity, occurrence generation, or member attribution diverges between caregiver and child projections.

## Instrumentation and observation

### Local event trace

Record development-only, non-production events for:

- `chores.quick_add.opened`
- `chores.quick_add.submitted`
- `chores.editor.opened` with source `direct` or `chat`
- `chores.enrichment.started`
- `chores.enrichment.field_proposed`
- `chores.editor.field_touched`
- `chores.enrichment.field_skipped_touched`
- `chores.enrichment.failed`
- `chores.editor.dismissed`
- `chores.chore_added`
- `chores.chore_undone`
- `chores.chat.opened`
- `chores.chat.draft_opened_in_editor`
- `chores.review_requests.opened` with count bucket `one` or `many`
- `chores.review_request.resolved`

The trace should use fixture IDs and field names, not child-entered text, photos, definitions of done, member codes, or model prompt contents. It exists to reconstruct state transitions during local evaluation, not to score family behavior.

### Direct observation

- Operate all eight scenarios on the iPhone 17 Pro / iOS 26.5 Simulator.
- Repeat representative scenarios with the keyboard open, AI delayed, AI failed, tokens off, tokens on, one approval, and several approvals.
- Capture the resting caregiver dock, focused Quick Add, immediately opened editor, partially enriched editor, saved receipt, Chat handoff, and one/many review states.
- Ask the caregiver to narrate what exists before and after **Add chore**, who will see it, and what AI changed.
- Have a child read and act on at least two caregiver-authored fixtures with different availability/review behavior, then give a short retell of what the chore requires.
- Record hesitation, corrections, mistaken assumptions, and caregiver explanation in manual notes. Do not record child audio or video by default.

## Brand-goodwill evidence

Goodwill is protected when:

- the caregiver feels assisted rather than corrected by AI;
- an enrichment failure is recoverable without losing work;
- no household consequence is hidden behind the AI action;
- a child receives only a clear chore, never the parent's draft or AI provenance;
- review language remains neutral and relational; and
- no family-performance telemetry, rankings, overdue alerts, or inferred behavior is introduced for the experiment.

## Decision rule

Proceed toward production architecture only after:

- all eight scenarios complete without a false pre-save write, lost capture, overwritten caregiver edit, or late post-save mutation;
- the caregiver correctly explains the commit boundary, participant, and availability in every representative playthrough;
- explicit recurrence cues are projected correctly across the scenario set and absent cues remain conservative;
- both direct and Chat entry reach the same editable draft contract and native save boundary;
- a child independently understands at least two newly authored chores without the caregiver translating them; and
- the review circle is correctly understood and remains usable at one and several pending items.

Revise or simplify when:

- AI saves too little work: reduce enrichment to definition-of-done suggestions or require explicit selection of **Repeat**;
- asynchronous filling feels unstable: open with deterministic values and move AI suggestions behind one opt-in action inside the editor;
- the dock is too crowded: retain direct Quick Add and far-right Chat, and move review attention back to a single capability-owned indicator that opens the same drawer;
- caregivers misunderstand the commit boundary: change the submit transition and editor heading/action rather than adding a confirmation screen; or
- child comprehension remains weak: improve the authored Chore contract before adding more parent controls.

Retire the concept if direct reuse of `QuickAddDock` cannot avoid an implicit pre-save Activity write, if AI cannot be prevented from overwriting edits, or if the unified editor cannot preserve one canonical caregiver-to-child truth without a second Chore task store.

## Expected next action

If the learning threshold is met, specify the production Household-authorized Chore draft/publish contract, Activity/occurrence persistence, Chat proposal operation, and offline/member-attribution behavior. If the threshold is not met, keep the Labs child-flow work intact and revise only the parent authoring surface or AI boundary indicated by the observed failure.
