# Quick Add Receipt Refinement

## What I See

Surface: `QuickAddDock` plus its post-create enrichment and location-recommendation behavior in Activities and Goal Detail.

User concern:

> I might be creating from the quick add dock, which doesn't really create space for me to quickly/easily answer the question about location, or confirm generated results.

The strongest failure is structural. Quick Add saves, clears, and normally collapses immediately. AI enrichment completes asynchronously afterward. The current location recommendation then opens a separate 34%-height `BottomGuide`, suppresses the normal receipt toast, and offers a binary location-trigger decision. The generated result is separated from the just-created Activity, consumes far more space than the question needs, and cannot express travel choices such as Nearby versus My Costco.

The second failure is contract clarity. Quick Add currently mixes safe generated details, ambiguous context such as which Costco, and permissioned behavior such as an arrive/leave alert. Treating all three as either silent mutation or a sheet forces too much or explains too little.

## The Anchor In Play

Primary anchor: `jtbd-capture-and-find-meaning`.

Supporting anchors: `jtbd-carry-intentions-into-action` and `jtbd-trust-this-app-with-my-life`.

Design principle: **Quick Add should finish capture immediately, then make generated meaning visible and correctable without requiring the user to remain in a creation flow.**

## References Worth Knowing

- [Todoist Quick Add](https://www.todoist.com/help/articles/introduction-to-tasks-080OAXric) uses natural language to set optional task properties inside a fast composer. Translate the expectation that capture remains the dominant action; do not copy its productivity-heavy property density.
- [Linear issue creation](https://linear.app/docs/creating-issues) treats edits during the first few minutes as part of creation. Translate the idea that refinement can remain temporally attached to capture without blocking the initial save; do not copy the desktop modal scale.
- [Apple HIG: Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback) recommends matching feedback prominence to significance and integrating passive status into the interface. Translate this into an inline receipt for normal enrichment and reserve sheets for explicit consequential actions.
- [Apple Maps nearby search](https://support.apple.com/guide/iphone/find-nearby-attractions-restaurants-services-iphbaf51b2c0/26/ios/26) presents nearby as an explicit search scope. Translate `Nearby` into a user choice rather than silently equating nearest with intended.

## Three Sketches

### A. Dock Receipt Strip

After submit, the composer collapses and a compact receipt appears directly above the normal collapsed Quick Add dock. The dominant line confirms the saved title. A second line appears when enrichment is ready and contains only actionable chips: `Costco?`, `Nearby`, `My Costco`, `Any`, or `Review`. Safe generated results can appear as compact receipts such as `3 steps added` or `Details added`. Tapping a chip applies or opens only that refinement. Starting another capture remains available underneath.

Anchor check: strong. Capture completes first; generated meaning remains adjacent, visible, and correctable.

Reference grounding: Apple passive feedback plus Linear's short post-create refinement window.

Best when: most follow-ups are zero- or one-tap decisions and enrichment may arrive asynchronously.

Fails when: the receipt tries to display every generated field or becomes a persistent review queue.

### B. Composer Follow-Up Mode

Keep the UnderKeyboard Quick Add composer open after submit and replace the cleared title area with one compact follow-up question. For Costco, show `Where does this belong?` with `Nearby`, `My Costco`, and `Any`. After selection or dismissal, restore the empty title input for the next capture.

Anchor check: medium-strong. The question is immediate and easy to answer, but it delays rapid successive capture.

Reference grounding: Todoist keeps optional task properties close to the composer.

Best when: the generated decision is available synchronously and the user usually captures one item at a time.

Fails when: AI results arrive after the dock has closed, the keyboard is already dismissed, or the user wants to add several to-dos quickly.

### C. Created-Row Refinement

Attach the generated Place question to the newly created Activity row in the list. The row temporarily expands with `Costco · Choose: Nearby / My Costco / Any`. Quick Add remains untouched. If the item is filtered, sorted elsewhere, or created inside Goal Detail, show a small link to open the new Activity.

Anchor check: strong for traceability, medium for speed. The question lives with the object it changes.

Reference grounding: Linear supports direct inline refinement of a created issue.

Best when: the created row is guaranteed to remain visible and the user is already scanning the list.

Fails when: keyboard, filtering, sorting, Goal Detail placement, or rapid creation moves the row out of view.

## Recommendation

Choose **A. Dock Receipt Strip** as the shared post-capture pattern.

The receipt should not require confirmation of everything AI generated. Use a consequence ladder:

| Generated result | Receipt behavior |
| --- | --- |
| Safe, reversible detail such as notes/steps | Apply; show a passive chip such as `3 steps added` with tap-to-review |
| Broad inferred context such as `Costco` | Apply a correctable task-level target; show `Costco` only when it creates a useful refinement or explanation |
| Ambiguous choice such as Nearby vs My Costco | Show direct choice chips; no preselection |
| Permissioned or interruptive behavior such as location alert | Show `Set alert`; open the full Place/Alert sheet only after tap |
| Low-confidence generation | Do not apply or surface it merely to prove AI ran |

### Receipt anatomy

```text
Created · Pick up something from Costco

Costco?   [Nearby] [My Costco] [Any]    Review ›
```

- No scrim or automatic sheet.
- One dominant unresolved question at a time.
- Horizontally compact choices; `Review` opens Activity Detail or a focused refinement sheet.
- Dismissal keeps the Activity and safest broad relationship, with no trigger and no required-review state.
- If another Activity is created, the newest receipt replaces the prior one. The previous Activity remains valid; unresolved ambiguity falls back to broad context rather than entering a queue.
- The created Activity row and Activity Detail retain the correction path after the receipt disappears.

### Bet

We're betting that the dominant blocker is not lack of confirmation UI but the wrong containment shape: a sheet asks the user to stop capturing for decisions that usually need one tap or no action. If the compact receipt is still ignored, the next move is attaching unresolved decisions to the created Activity row, not making the receipt larger.

### First slice

- Replace the automatic Quick Add location `BottomGuide` with a compact dock-adjacent receipt.
- Support one travel-mismatch question: `Nearby`, `My Costco`, or `Any`.
- Preserve `Review` for specific-place search and explicit Alert setup.
- Show safe enrichment summaries without requiring approval.

### Success signal

Users answer meaningful Place questions without losing capture momentum, continue adding another to-do immediately when desired, and can explain which generated results were applied versus which still require an explicit choice.
