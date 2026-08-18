# Converge: AI-Enriched Native Chore Quick Add

## Decision

Choose **One Native Chore Editor**, built by directly reusing the existing To-do `QuickAddDock`: the caregiver enters one ordinary-language chore description, submit opens the actual **New chore** drawer immediately instead of inserting an item into the list, and selected AI actions fill useful structure while the parent can already edit. **Add chore** is the first commit to the household inventory.

This is not a Chat-first builder. The direct path gets the same useful AI enrichment as To-do Quick Add. Contextual Chat remains the path for a caregiver who wants to explain a broader household problem or ask for help thinking it through.

## Qualitative scoring

| Alternative | Maya fit | Job fit | Child-legible result | System fit | Blast radius | Admin risk | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A. One Native Chore Drawer | Strong | Strong | Strong | Strong | Medium | Low | **Choose and enrich with existing Quick Add AI** |
| B. Private Capture, Contextual Clarification | Medium | Strong at capture | Strong after setup | Medium | Medium-high | High | Reject durable draft queue |
| C. Conversational Chore Builder | Mixed | Strong for ambiguity | Strong after native editing | Medium | High | Medium | Keep as secondary path |
| D. Draft Row In Place | Medium | Medium | Medium | Medium-low | High | Medium | Reject editable inventory state |

## Chosen interaction

### Resting caregiver dock

```text
[ Add a chore                                  ] [Review N] [Chat]
```

- **Add a chore** uses the familiar embedded Quick Add composer.
- **Review requests** is a conditional full-circle button immediately left of Chat. It appears only for an authorized caregiver when child submissions are waiting.
- **Chat about chores** is the stable far-right full-circle button.
- When no review request exists, the review button is absent and Chat retains its far-right anchor.
- This dock replaces the caregiver-only floating review guide inside Chores. The capability-menu count remains the attention signal outside Chores.

### Direct creation

1. The caregiver taps **Add a chore**.
2. The existing `QuickAddDock` component expands with its under-keyboard multiline field and AI-actions menu. Chores changes the placeholder, labels, enabled actions, and submit destination; it does not rebuild the component.
3. The caregiver can type a terse title or an ordinary sentence:
   - `Empty the dishwasher`
   - `Charlie feeds Pepper every weekday morning`
   - `Wipe the table after dinner and put the cloth in the hamper`
4. The default AI actions are:
   - **Steps** — propose a concise, child-readable definition of done.
   - **Repeat** — extract an explicit timing or recurrence cue into the same recurrence contract used by To-dos.
   - **Details** — clean up the title and preserve useful instructions from the sentence.
5. Submitting retains the exact typed text in a transient local draft and immediately opens the native **New chore** editor drawer. No item lands in the inventory yet.
6. The parent can edit every field immediately while enrichment runs. AI may populate only fields the parent has not touched; late results never overwrite an edit. Failure never loses the capture or blocks manual creation.
7. The caregiver taps **Add chore** to publish the Chore profile and its canonical Activity/occurrence behavior.
8. The inventory shows a concise receipt such as `Chore added for Household · View · Undo`.

The direct path does not open a conversational thread. AI enrichment is a bounded authoring aid inside Chores, using the same interaction grammar already established by To-do Quick Add.

### What AI may infer

AI may propose only structure supported by the caregiver's input and the Chores draft contract:

- a shorter child-readable title;
- two to four concise steps or one definition-of-done sentence;
- daily, weekdays, weekly, monthly, or yearly recurrence when the language supports it;
- a named household participant only when the caregiver explicitly names an unambiguous household member; and
- trusted completion versus caregiver review only when the caregiver explicitly requests review or approval.

AI must not invent:

- which child should own an unnamed chore;
- a rotation or fairness policy;
- token value, allowance, punishment, or Screen Time consequence;
- a requirement for photographic evidence;
- a due time or recurrence unsupported by the input; or
- household-wide expectations.

When timing is absent, **Repeats** remains visibly **One time**. When participation is absent, **For** remains the visible household-open default. AI uncertainty resolves to a neutral field value or an editable suggestion, never a hidden assumption.

### Native New chore editor

The three-second read is: what the chore is, who can do it, when it appears, and the single **Add chore** action.

Required before publication:

1. **Chore** — child-readable title.
2. **For** — named member or **Household**.
3. **Repeats** — the shared To-do recurrence pattern, with no recurrence presented as **One time**.

Progressively disclosed:

- **What done means** — concise steps or definition of done.
- **Completion** — **Trust when marked done** or **Caregiver reviews**.
- **Tokens** — visible only when the household token program is active; use the household default unless the caregiver changes it. AI never chooses the value.

The drawer does not contain per-person expectations, Screen Time rules, token-program setup, rotation, household membership, Goal or Arc selection, due-date mechanics, reminders, priorities, estimates, tags, or a second Chore-only recurrence editor.

The existing To-do recurrence editor supplies:

- **One time**
- **Daily**
- **Weekdays**
- **Weekly**
- **Monthly**
- **Yearly**
- **Custom…** for every N days, weeks, months, or years, including selected weekdays.

The parent sees the existing readable recurrence result, not `ActivityRepeatRule` terminology. Chores shares the same one-active-occurrence behavior: missed copies do not pile up, trusted completion advances immediately, and review-required completion advances after approval.

### Contextual Chat

Tapping the far-right circle opens a fresh durable Chat with visible, removable **Household** and **Chores** context plus an exact return target.

Chat is useful for requests such as:

- `What chores would help our school mornings go more smoothly?`
- `Help me turn taking care of Pepper into something Charlie can own.`
- `We keep arguing about the dishwasher. What is a clear definition of done?`

When the caregiver asks to create a chore, Chat stages one typed Chore draft proposal. **Edit in Chores** opens the same native **New chore** editor used by direct Quick Add. It is not a preview: the caregiver lands directly in editable fields and **Add chore** performs the first commit. Chat never publishes, assigns, schedules, rewards, or connects Screen Time itself. A broader request may be discussed conversationally, but the first learning slice advances only one draft at a time into the editor.

### Review requests

- The conditional circle uses a calm review/inbox glyph and factual numeric badge, not a warning color.
- Its accessibility label is `Review 1 chore request` or `Review N chore requests`.
- One pending item opens directly to its review detail.
- Several pending items open the existing scroll-safe queue.
- Approve and **Needs another pass** preserve performer and performance time.
- The queue contains child-initiated submissions only. Overdue chores, missed expectations, inferred noncompliance, and historical activity do not become alerts.
- Resolving the final request removes the circle after the drawer closes so the dock does not change beneath the caregiver's active decision.

## Capability delta

### Today, the caregiver cannot

- create the Chore definitions that feed the child learning experience;
- turn one ordinary-language description into child-readable steps and availability;
- use direct capture and contextual Chat as two inputs to one Chores-owned draft;
- confirm household participation before a chore reaches a child; or
- resolve child submissions from the same action region used to create chores.

### After this concept ships, the caregiver can

- type one simple chore description in the familiar dock;
- let bounded AI propose steps, details, and supported recurrence;
- confirm **For**, **Available**, completion behavior, and optional token value in one native drawer;
- publish one canonical Activity-backed Chore without building a rules system;
- ask Chat for broader help and review its result through the same native boundary; and
- open pending child submissions from a dedicated, contextual dock action.

### Still intentionally not possible

- silent AI publication or reassignment;
- rotating or automatically balanced work;
- bulk chore generation and approval;
- expectation, Screen Time, allowance, or token-program authoring inside Quick Add;
- child access to caregiver creation, Chat, or approval controls; or
- a household monitoring dashboard.

## Existing workaround removed

Maya no longer needs to create a generic repeating To-do, separately remember that it belongs to a child, translate its recurrence into child language, and then rely on an invisible simulated fixture to make it appear in Chores. She also does not need to choose between manual creation and an AI-only workflow; both paths produce one reviewable Chores-owned draft.

## Reductive design decisions

- Directly reuse the existing `QuickAddDock` component instead of adding a Chores FAB, forked composer, or approximate copy.
- Adapt the existing AI actions to **Steps**, **Repeat**, and **Details** rather than building a conversational wizard.
- Use one native **New chore** editor drawer for both direct and Chat-authored drafts; do not add a preview or confirmation drawer before it.
- Require only title, participation, and recurrence before publication.
- Keep optional policy collapsed and remove unrelated Activity fields entirely.
- Replace the floating caregiver review guide with the conditional review circle.
- Keep the capability-menu badge because it solves attention from outside Chores; do not add a global notification inbox.
- Refuse durable unfinished-draft inventory, inline editable rows, templates, bulk generation, and a household rules dashboard.

## Activation path

- The dock appears only in an authorized caregiver projection of Chores.
- The direct composer needs no tutorial because it inherits the established To-do Quick Add behavior and says **Add a chore**.
- The first time AI enrichment produces a native draft, a quiet inline note may say `Suggested from what you wrote · Review before adding`; it should not recur after comprehension is established.
- Contextual Chat is discoverable through the stable far-right action but is not required for ordinary creation.
- The review circle activates only when a child submission gives the caregiver something actionable.
- Natural adoption is a caregiver creating a real recurring chore from one sentence, editing immediately in the native drawer while useful fields arrive, and later recognizing the same chore in the child's experience.

## Accepted trade-offs

- Direct creation takes one explicit **Add chore** action in the editor before the chore reaches the household; there is no separate preview or confirmation step.
- AI enrichment may add a short wait, but the typed capture remains intact and manual review remains available.
- The first release handles one proposed chore at a time even when Chat discusses a broader household rhythm.
- Reusing To-do recurrence introduces no second Chore-specific scheduling model and keeps future cadence improvements coherent across both capabilities.

## Rejected trade-offs

- Publishing immediately and correcting later, because assignment and recurrence affect another person's experience.
- Requiring Chat for intelligent setup, because basic creation must remain quick and dependable without conversation.
- Keeping a permanent Review button at zero, because an empty approval destination would add dead caregiver chrome.
- Putting expectation or Screen Time configuration in the drawer, because a chore definition is not the household agreement that evaluates it.

## System implications

- Define one Chores-owned draft contract that can be populated by direct input, AI enrichment, or a typed Chat proposal.
- Reuse `QuickAddDock` directly and separate its draft/enrichment work from the current To-do controller's immediate `addActivity` commit. The Chores submit adapter opens the editor and does not write into either the personal Activity store or Chores inventory before **Add chore**.
- Track field-level touch state in the editor so asynchronous AI enrichment can fill untouched fields but cannot overwrite caregiver edits. Ignore or cancel late enrichment after save or dismissal.
- Persist through the canonical Activity definition plus Chore profile; create occurrences only after publication.
- Add household-authorized Chores read/write operations before enabling contextual Chat proposals.
- Preserve explicit actor, authorizer, assignee/eligible scope, recurrence/availability, and source provenance.
- Keep AI-enriched fields distinguishable from caregiver-confirmed persisted truth until **Add chore** succeeds.

## Bet

We're betting that a parent can describe most ordinary chores in one short sentence and that bounded AI can prepare repetitive structure—especially steps and recurrence—while the actual editor is already open, making creation feel faster than configuring fields manually without introducing a preview step. If parents routinely rewrite the proposal, race with late suggestions, or miss household consequences, revisit by making direct structured choices primary and limiting AI to optional definition-of-done help.

## Success signal

In observed caregiver use, Maya can create `Charlie feeds Pepper every weekday morning` from the Chores dock, accurately explain who will see it and when it will appear, correct any AI suggestion before publishing, and then find the same canonical chore in Charlie's child experience. The flow should require no explanation of Activities, recurrence rules, household scopes, or AI authority.
