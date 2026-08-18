# Yes-And: Parent Chore Creation

## Original idea

Use Kwilt's standard bottom action-dock paradigm to let a caregiver create a chore directly, ask contextual Chat for help, and resolve child review requests without leaving the Chores capability.

## Adjacencies

### 1. Yes, and what if direct capture and Chat always produced the same visible draft?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: moves AI from a separate authoring system to a helpful input method for the caregiver's own Chores workflow.
- New value: a parent can begin with a title or a sentence such as “The kids need to rotate feeding the dog,” then inspect the same native fields and consequences before anything reaches a child.
- Cost delta vs. original: medium
- Anti-pattern check: pass if Chat stages reviewable Chores-owned drafts; failure if conversational confirmation or model prose becomes authority to publish assignments.

### 2. Yes, and what if the creation path carried the caregiver's current Chores context without hiding its effect?

- Serves: `jtbd-get-help-without-retelling-my-life`
- Job elevation: turns location in the product into useful setup context instead of asking Maya to restate which household or member she is managing.
- New value: entering from an explicitly selected child scope may visibly prefill **For Charlie**, while entering from the household inventory visibly defaults to **Household**. The draft always shows that choice before save.
- Cost delta vs. original: low
- Anti-pattern check: pass if the prefill is visible, editable, and derived from an explicit caregiver view; failure if the active child actor on a shared device is mistaken for caregiver authoring scope.

### 3. Yes, and what if a saved chore immediately taught the next useful refinement instead of requiring complete setup first?

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: preserves capture in motion while helping a repeated reminder become a dependable rhythm over time.
- New value: after saving a minimal chore, a concise receipt can offer exactly one relevant continuation such as **Make it repeat**, **Add what done means**, or **Require review**, based on what remains unset.
- Cost delta vs. original: low
- Anti-pattern check: pass if the suggestion is contextual and dismissible; failure if every save starts a setup wizard or creates a queue of unfinished configuration.

### 4. Yes, and what if the review action helped improve unclear chores, not merely approve submissions?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: treats repeated child confusion as information about the agreement rather than evidence that the child needs more monitoring.
- New value: after **Needs another pass**, the caregiver may optionally update **What done means** for future occurrences while preserving the current child's submitted evidence and original performance time.
- Cost delta vs. original: medium
- Anti-pattern check: pass if the correction remains calm and occurrence history is preserved; failure if Kwilt scores children, diagnoses intent, or automatically rewrites expectations from behavior.

### 5. Yes, and what if caregivers could reuse an existing household rhythm without creating a template library?

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: reduces repeated setup while keeping the household's own language and practices primary.
- New value: **Duplicate** on an existing chore starts a new draft with availability and definition-of-done carried forward, while **For** and reward/review consequences remain visible for confirmation.
- Cost delta vs. original: low
- Anti-pattern check: pass if duplication is a contextual action on a known chore; failure if Chores gains a separate template manager, marketplace, or configuration taxonomy.

### 6. Yes, and what if an ordinary To-do could become a household chore through the same native editor?

- Serves: `jtbd-invite-the-right-people-in`
- Job elevation: lets Maya hand off a responsibility at the moment she recognizes it without recreating the underlying Activity.
- New value: an eligible Activity can choose **Make this a chore**, which opens the same Chores-owned editor and adds household participation to the canonical Activity rather than copying it.
- Cost delta vs. original: medium
- Anti-pattern check: pass if only the minimum actionable Activity projection is shared; failure if linking exposes the parent's surrounding To-dos, Goal, Arc, or personal notes.

### 7. Yes, and what if contextual Chat could prepare a small set of chore drafts while preserving individual review?

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: turns a fuzzy household concern such as “school mornings are chaotic” into a few concrete candidate responsibilities without making the parent invent the list alone.
- New value: Chat can stage two or three separate drafts, explain the proposed participation and timing, and send each into the same native editor where the caregiver edits, adds, or discards it independently.
- Cost delta vs. original: high
- Anti-pattern check: pass if the batch is small, proposals remain separate, and none are published by default; failure if Chat generates a whole household system, silently assigns children, or makes the parent review a long AI checklist.

### 8. Yes, and what if the dock made child requests feel like participation rather than alerts about noncompliance?

- Serves: `jtbd-invite-the-right-people-in`
- Job elevation: shifts the caregiver experience from checking whether children complied to responding when they actively ask for review or help.
- New value: the conditional circle is labeled **Review requests**, shows only a factual count, and opens the child's submitted work. It can later admit an explicit **I need help** request without becoming a generic family notification center.
- Cost delta vs. original: low for approvals; medium if help requests are added
- Anti-pattern check: pass if only child-initiated, actionable Chores items enter the queue; failure if overdue work, missed expectations, or inferred problems become red alerts.

## Job elevation

The dock is not only a faster “new chore” button. In its strongest bounded form, it is the caregiver's Chores action surface: capture something, ask for help shaping it, or respond to a child who has handed work back for review. It removes three kinds of remembering burden without adding a dashboard.

This does not justify absorbing expectation authoring, Screen Time policy, token redemption, household membership, analytics, or historical monitoring into the dock. Those remain separate capability-owned decisions reached contextually after real chore inventory exists.

## Frame recommendation

**Run design-thinking-loop with an expanded frame.** Expand from **parent chore creation** to **the caregiver Chores action dock**, with three sharply bounded jobs:

1. Create a canonical Chore draft directly.
2. Ask contextual Chat to prepare the same kind of draft.
3. Respond to child-initiated review requests.

Creation remains the primary frame. Review is included because it completes the parent-child handoff and the user explicitly placed it in the same dock. The dock must not become a household dashboard or rules console.

For the first learning slice, direct creation should produce one draft, Chat should produce one draft per reviewed proposal, and the review circle should handle approval submissions only. Batch Chat authoring, help requests, To-do conversion, and future-occurrence definition updates remain compatible follow-ons after the basic loop proves understandable.
