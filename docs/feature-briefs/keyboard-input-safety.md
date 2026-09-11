# Canonical Text Editing Behaviors — PRD

Status: **Draft for Andrew's review**, September 10, 2026. This substantively replaces the older MVP keyboard-safety brief. It specifies proposed behavior, not a claim of implementation or app-wide acceptance.

## Context and scope

People need predictable text entry when a field is partially visible, grows, reaches its height limit, moves with a keyboard, or finishes editing. Static field styling and keyboard padding alone do not define these moments. The prior MVP claim that consolidation was complete and only validation remained is superseded: interaction semantics and compatibility remain open work.

This PRD owns text-editing behavior and the input/container contract. Sharing-sheet composition is owned by its separate initiative. The parallel **Audit and unify input patterns** task owns visual input standardization, component usage rules, and the comprehensive migration plan, starting from [the input-unification inventory](../design-explorations/input-unification/2026-09-10-inventory.md). Andrew approved that task's direction and requested implementation planning; specific tokens and runtime acceptance remain subject to its review. This PRD supplies behavior requirements to that migration rather than creating a second input family or competing migration plan.

### Coordination with visual input standardization

- Visual treatment owns fill, border, radius, typography, spacing, field anatomy and presentation variants. The bordered fields, colors and dimensions in this task's generated storyboards are illustrative, not competing visual requirements.
- This PRD owns focus/reveal transitions, growth and scrolling behavior, Return/Done semantics, persistence compatibility and native acceptance scenarios. Visual focus/error cues come from the visual standard; their accessibility, stability and behavioral meaning must satisfy both contracts.
- Typography and padding changes alter text measurement and the available editing region. Visual migration must rerun applicable growth, selection, keyboard and large-text cases, even if no keyboard code changed. Existing pixel bounds in this PRD are compatibility baselines, not a veto on reviewed sizing tokens.
- Use the visual task's migration ledger as the shared implementation record. Each migrated site needs its semantic/persistence classification and applicable behavior evidence from this PRD, alongside visual acceptance. A visual pass cannot substitute for keyboard proof, or vice versa.
- Changes to shared Input APIs, sizing, focus, or keyboard containers need one coordinated implementation owner at a time in the shared checkout. Neither task should independently introduce a replacement component or change caller completion defaults. Resolve a conflict explicitly in the relevant contract before migration; do not silently reinterpret it as styling.

Non-goals: redesign every textarea, replace fields with drawers on focus, add Save/Send to every field, change publication policy, flatten rich text, introduce a new app/lab/dependency, or migrate all callers by flipping shared defaults. Existing dedicated rich editors may continue opening from previews.

## Target audience and representative persona

Maya, an aspirational family organizer, captures an ordinary to-do or corrects a goal between other commitments. She should not need to learn a different way to finish each field or fear losing her words.

## Aspirational design challenge

How might we make every editing transition predictable while preserving the speed, meaning, and persistence of existing capture and inline-editing flows?

## Hero JTBD and job flow

Hero: `jtbd-move-the-few-things-that-matter`. Supporting jobs: `jtbd-capture-and-find-meaning` and `jtbd-trust-this-app-with-my-life`.

[Move family life forward](../job-flows/maya-move-family-life-forward.md): Capture to-do currently scores 4; Trust it will not disappear and Keep using system score 3. This work protects capture quality and reduces interaction uncertainty; no score increase is claimed until runtime and user acceptance.

In user voice: “Let me put down or correct my words, finish in the way this task promises, and find them where I expect afterward.”

## Design authority and model

Explicit user decisions → platform/accessibility constraints and current Kwilt design authority → this proposed behavioral contract after acceptance → adapters and caller configuration. The [UI constitution](../design-system/ui-constitution.md) and [component inventory](../design-system/component-inventory.md) still govern maturity and visual primitives. This draft does not grant new Canonical status.

Classify an editor along independent dimensions. Visual wrapping does not determine input meaning or persistence.

| Dimension | Supported distinctions |
| --- | --- |
| Meaning | Paragraph text; one value that visually wraps; explicit capture/message; structured rich text. |
| Entry | Existing native field focuses in place; readable content activates an inline editor; an established preview opens a dedicated editor. |
| Completion | Newline; end editing; next field; explicit submit. Key appearance must match behavior. |
| Persistence | Parent form draft + explicit Save; inline commit on blur/submit; live/debounced autosave; explicit create/send/publish. |
| Sizing | Bounded growing textarea; existing content-sized inline title/step; dedicated scrolling editor. |
| Host | Screen, card/list, sheet/dialog, capture dock, or embedded web/rich editor. |

Every migrated caller must declare these meanings, its empty/invalid behavior, and its host. This is a review contract, not a requirement for a new configuration framework or six new components.

## Keyboard action and completion requirements

- **KEY-01 Paragraph textarea:** software Return inserts a newline and retains focus. Do not turn Return into submission merely because the field lives in a form. Supply a reachable editing-completion affordance; use the host's suitable existing Done first, otherwise one compact keyboard accessory Done. Do not duplicate both without a demonstrated accessibility need.
- **KEY-02 Wrapped value/capture:** a title or Quick Add may use Done/Next/submit. Preserve the existing per-platform behavior until a specific change is accepted. A blue keyboard action is system presentation, not a Kwilt color token or proof that content saved.
- **KEY-03 Meaning and appearance:** configure key label/hint and submit behavior together. Hardware Return follows the declared semantic action; paragraph input must support ordinary newline entry. Preserve existing explicit modifier shortcuts, documenting platform differences. No new hardware submit shortcut is implicit in this PRD.
- **KEY-04 End editing:** dismiss the keyboard and execute the declared finish policy. For form drafts this does not commit the form; for inline commit-on-blur it can commit the value; for autosave it flushes as required. Thus “Done never saves” is NOT universal. Ending editing never implicitly publishes a personal moment or sends a message.
- **KEY-05 Exactly once:** a keyboard submit followed by blur must not create duplicate records, duplicate commits, or duplicate requests. Commit the latest native text, including completed autocorrection/composition, before the host proceeds.
- **KEY-06 First tap:** an enabled Save or other intended control works on the first tap with the keyboard open. Field switching focuses the new field in one tap. Dismiss-only taps must not swallow the intended control action.

## Focus and visibility requirements

The host computes the usable editing region from its real bounds, sticky header, safe area, keyboard occlusion, accessory, and fixed controls. Exactly one layer owns each inset; never add keyboard height twice. Caret visibility is an active-editing requirement, not an instruction to fight deliberate user scrolling.

| ID / event | Required transition and acceptance |
| --- | --- |
| FOC-01 Tap an existing visible textarea | Focus the same native field at the native tapped insertion/selection position. Do not replace it, select all, or move the cursor to the end. If it already fits after keyboard appearance, do not scroll. |
| FOC-02 Tap a partially clipped field | Resolve the tap before scrolling. After keyboard/viewport layout, minimally reveal the field above the keyboard and below the header. Preserve selection. Applies to clipping at either edge, with keyboard initially open or closed. |
| FOC-03 Field fits | Reveal the whole field and its label where practical with shared clearance. Proposed starting clearance: existing spacing.lg (16pt), counted once. Do not center or dock a field simply because it focused. |
| FOC-04 Field exceeds available space | Prioritize the insertion point/active selection edge and surrounding text. Keep editing and completion usable; labels must remain accessible even when they cannot remain onscreen. Never require the entire document to fit. |
| FOC-05 Inline activation | A readable title may mount its existing editor in place. Preserve heading typography, position, trigger semantics, and established initial selection behavior. The exact tapped character is not guaranteed by a newly mounted editor; native characterization must establish it before changing that behavior. |
| FOC-06 Move between fields | Finish the old field according to its policy; focus/reveal the new field without keyboard flicker or a stale scroll back to the old field. Async measurements must be discarded when field, account, route, or container changes. |
| FOC-07 Selection and user scrolling | Respect text selection, selection handles, long press, and deliberate parent/internal scrolling. Do not recenter on every scroll frame. Resume necessary reveal on new typing, selection movement, explicit focus, or changed occlusion. |
| FOC-08 Keyboard/frame changes | Emoji, prediction bar, dictation, rotation, text scaling, window resizing and nested modal transitions recompute the usable region while preserving text and selection. Floating/split keyboards use actual occlusion rather than assuming a full-width bottom rectangle. |
| FOC-09 Dismissal | Settle the expanded viewport without resetting to a remembered top-of-page offset. Keep a useful reading anchor and respect any existing collapsed-preview policy after blur. No blanket requirement that every editor keep its focused height. |

## Growth and scrolling requirements

- **SIZE-01 Bounded paragraph fields:** grow with rendered content from their declared minimum to the smaller of their declared maximum and usable editing space. Current Input defaults (112–220pt) are a compatibility baseline, not final new design tokens. Validate line-based/text-scaled limits before choosing new defaults.
- **SIZE-02 Stable growth:** preserve the text position being edited. Following content moves naturally; the host only scrolls enough to maintain visibility. Pasting many lines must settle without repeated jumps. Maintain raw content measurement so shrinking the keyboard can restore height without another text event.
- **SIZE-03 At the cap:** keep outer height stable; native internal scrolling follows the active line. The parent reveals the editor; the editor reveals its text. Avoid two layers repeatedly correcting each other.
- **SIZE-04 Existing inline content:** do not force a paragraph-sized minimum or nested scroll cap onto titles and checklist steps. Preserve their content-sized model while requiring the host to reveal the caret/selection. Oversized titles need explicit native proof, not a helper that silently skips them.
- **SIZE-05 Deletion:** content may shrink toward its declared minimum without losing selection or collapsing the active field into a different surface. Reaching empty must not invent a new persistence or navigation action.
- **SIZE-06 Gestures:** inside a capped textarea, a text scroll gesture scrolls text; outside, the parent scrolls. Selection gestures must not dismiss or drag the sheet. Boundary handoff must be characterized on each native host; do not invent simultaneous gesture ownership.

## Persistence, errors, and interruptions

- **DATA-01** Preserve each caller's trim/normalization, empty-value, validation, commit, cancellation, and undo behavior unless changed in a separately reviewed product decision.
- **DATA-02** Invalid ordinary drafts remain available for correction. Show a specific associated error and reveal the relevant field/error on attempted completion without trapping focus. Announce errors accessibly; do not repeatedly announce on every keystroke.
- **DATA-03** Existing required-title empty-blur restoration is an explicit compatibility exception: an empty title edit can restore the prior value. Never generalize that behavior into discarding invalid paragraph text.
- **DATA-04** Retain recoverable edits after local/network save failure and provide a truthful retry path. A keyboard closing, callback firing, or optimistic store update does not prove remote durability. “Saved” must identify the actual persistence boundary.
- **DATA-05** Preserve draft behavior through navigation, sheet dismissal, app backgrounding and account changes; do not leak drafts across accounts. No new permanent storage is required for fields that currently do not persist drafts without a scoped decision.
- **DATA-06** IME marked text, emoji/graphemes, dictation, paste, autocorrection, undo/redo and selection replacement must not be truncated or committed mid-composition by growth/reveal logic. Keep field-specific length semantics; storyboard limits were examples, not new product limits.
- **DATA-07** Read-only/disabled inputs must not unexpectedly focus or open a keyboard. Picker triggers remain buttons even when implemented with a non-editable input internally.
- **DATA-08** Hardware Escape, Android Back, tap-away and drag dismissal follow the host's declared finish/cancel policy. Dismissing a keyboard must not accidentally pop the route or discard a draft. Preserve existing first-Back keyboard dismissal and explicit Cancel semantics; do not add a universal Escape-to-discard rule.
- **DATA-09** An external value update or delayed save response must not overwrite an active local draft or another object's value. Each host must preserve its existing conflict/reconciliation policy, record the draft's object/account identity, and characterize save ordering before migration.

## Compatibility audit and protected moments

Source audit on September 10, 2026: main at 9baf1a4a8e14b83e806c1df9e25ee4d3e66d0678 with substantial working-tree changes. These are source observations, not a complete runtime inventory or proof of every route. Existing input-unification counts are supporting exploration, not reachability proof.

| Existing moment / source | Observed behavior to preserve | Risk of a blanket textarea migration |
| --- | --- | --- |
| To-do inventory card → detail: [ActivityInventoryRow](../../src/features/activities/ActivityInventoryRow.tsx), [ActivitiesScreen](../../src/features/activities/ActivitiesScreen.tsx) | Row routes onPressActivity to navigateToActivityDetail. Preserve card navigation, checkbox/metadata actions, and list return position. The examined inventory row is not itself a title textarea. | Intercepting card taps to open an editor changes navigation; other card variants still need a caller inventory. |
| To-do detail title: [ActivityDetailRefresh](../../src/features/activities/ActivityDetailRefresh.tsx), [NarrativeEditableTitle](../../src/ui/NarrativeEditableTitle.tsx) | Readable heading activates inline editing; onCommit updates the activity. Parent Done dismisses editing. Preserve layout and no-op unchanged commits. | A form Save requirement or paragraph box would add friction; a universal height cap could break heading layout. Earlier Simulator work observed header overlap: fix obstruction without changing the editing job. |
| Goal detail title: [GoalDetailScreen](../../src/features/arcs/GoalDetailScreen.tsx), NarrativeEditableTitle | Trimmed nonempty changed title updates the goal. Blur commits; empty blur restores original title. Current iOS native input uses multiline/default Return; Android uses Done + blur. | The proposed wrapped-value default must not silently change iOS newlines or empty behavior. Cross-platform Return parity needs a separate explicit decision. |
| Quick Add: [QuickAddDock](../../src/features/activities/QuickAddDock.tsx) | Wrapping native input, Done/submit creates, empty submit collapses; arrow action and AI options belong to capture. Existing focused dock owns keyboard geometry. | Universal newline Return, new Done accessory, or another keyboard wrapper changes capture or double-adjusts geometry. |
| Inline fields: [EditableField](../../src/ui/EditableField.tsx) | Draft + validation; commits on submit/blur. | Generic controlled Input replacement could remove commit semantics; submit plus blur needs exactly-once proof. |
| Legacy [EditableTextArea](../../src/ui/EditableTextArea.tsx) | Draft and blur commit; optional collapsed lines and AI action. No current production consumer established by this audit. | Do not promote it merely because of its name. Validation failure followed by unconditional exit from editing deserves regression characterization before reuse. |
| Rich notes / goal description: [LongTextField](../../src/ui/LongTextField.tsx) | Read preview opens established rich editor; debounced changes and flush behavior, formatting and editor tools. | “Every field stays in place” would remove an existing intentional editor flow; plain textarea migration could lose rich content. |
| To-do steps: [ActivityDetailRefresh](../../src/features/activities/ActivityDetailRefresh.tsx), [ActivityDetailScreen](../../src/features/activities/ActivityDetailScreen.tsx) | Existing step text calls its update handler on each change. Inline fields are content-sized, internal scrolling disabled, Done/blur configured. New-step submit calls commitInlineStep('continue'); blur calls commitInlineStep('exit'). | Preserve updating an existing step versus creating another, rapid create-and-continue, blank exit, and exactly-once submit/blur. A universal newline key, dismiss-only Done, or global cap could break this flow. |
| Ordinary form Input: [Input](../../src/ui/Input.tsx) | Parent owns value/onChange and persistence; keyboard props remain caller-configurable. | Automatically saving on blur, adding buttons, or assuming all multiline values are paragraphs changes unrelated forms. |
| Home/chat composers, native and embedded web | Existing explicit send/publish and drafts remain source-owned. Home composition is outside this thread. | A shared finish action must never publish/send; web/rich editor focus requires its own adapter, not blind native measurement. |

### Corrections to earlier conversation defaults

1. “Done only dismisses; Save commits” applies to explicit-save forms, not inline blur-commit or autosave editors.
2. “The field never opens another surface” applies to an ordinary editable field, not an established LongTextField preview.
3. “All multiline fields use newline” applies to paragraph semantics, not every wrapping title/capture input. Preserve current iOS title behavior pending a separate decision.
4. “Every textarea grows then scrolls internally” is a bounded paragraph model, not the required sizing model for all inline headings or rich editors.

## Component-system responsibilities and migration

Keep the existing owned components. Input owns text traits, selection and bounded growth; the container owns occlusion and parent scrolling; the feature owns persistence and actual domain actions. Existing inline-title, capture, and rich-editor adapters remain until their behavior is proved equivalent. Use a native capability extension only when measured caret/selection requirements cannot be met by the existing APIs; do not claim a rectangle-based reveal helper proves caret behavior.

1. Classify live callers and their activation/return/persistence/sizing contracts. Start with the protected moments above; include card variants, list virtualization, sheets, forms, rich editors, search and embedded chat. No blind global default switch.
2. Add focused characterization tests around meaningful existing commits, empty restoration and submission. Record runtime baselines for spatial/gesture behavior. Do not test cosmetics by mirroring component structure.
3. Implement shared behavior through existing primitives/containers with opt-in caller migration. Keep one checkout owning runtime verification. No demo app or permanent test screen is required.
4. Migrate one representative ordinary textarea, inline title, quick-capture flow, and rich-editor adapter separately. Check dependents after each shared change. Home visual work remains separate.
5. Promote the behavioral contract only after owner acceptance, native evidence, and preserved caller semantics. Remove obsolete handlers only after their callers migrate; do not leave a second competing keyboard system.

## Acceptance matrix

Each migrated family must record applicable cases as pass, fail, or not tested, with platform/device/build/source evidence. A source audit, generated storyboard, or unit pass cannot count as native acceptance.

| Scenario | Pass criterion |
| --- | --- |
| Tap fully visible / top-clipped / bottom-clipped field, keyboard open and closed | Correct entry and selection; minimal final reveal; no header/keyboard obstruction or duplicate tap. |
| Type, paste, delete across size limits | Growth, cap, internal scroll or declared content-sized behavior; no hidden caret, jump loop, or lost text. |
| Select/edit earlier lines; drag selection; scroll parent and field | Selection remains usable; manual scroll respected; new typing reveals appropriate line. |
| Return / Done / Next / submit / hardware keys | Declared per-platform behavior; latest text committed at most once; paragraph newline retained. |
| End inline title editing, unchanged or empty | Existing trim/no-op/restore contract preserved; card/detail navigation and reading anchor intact. |
| Edit existing checklist step; add several steps using keyboard action | Existing edits update the right step; submit creates once and continues entry; blur exits under existing policy; no duplicate step from submit plus blur. |
| Keyboard height changes; rotate; accessibility text; small viewport | Recompute real occlusion, preserve selection, accessible completion and enough text to edit. |
| Validation, local/network failure, retry and in-flight dismissal | Draft recoverable under declared policy; truthful status; no duplicate save/create/publish. |
| Rapid field switching, nested picker, navigation, list recycling | No stale focus/reveal, wrong-object commit or keyboard flicker; focus returns appropriately. |
| IME, emoji, dictation, paste, undo/redo | Correct text/composition and selection; no mid-composition submit or destructive normalization. |
| VoiceOver/TalkBack, external keyboard, read-only/disabled | Names, errors, focus order and completion usable; no unsolicited focus trap. |

Test smallest supported and representative large iPhones, iOS keyboard variants, and supported Android configurations. Include iPad floating/split keyboard only where supported by the product; otherwise explicitly record the support boundary. Respect Reduce Motion and minimum touch targets. Test against real sticky headers and footers, not an empty full-screen playground.

## Success signal and acceptance decisions

A person can enter, revise and finish text without a hidden active line, surprise commit, lost draft, or unexplained layout jump. Existing capture and inline editing take no extra steps. Runtime evidence, not a claimed universal wrapper, establishes coverage.

Review decisions: exact paragraph min/max line policy at accessibility sizes; when a fallback Done accessory is needed; iOS title Return parity; reliable caret/selection measurement for content-sized fields; gesture handoff at internal-scroll boundaries; supported tablet configurations. Proposed defaults above are buildable review candidates, not acceptance by omission.

No production code is changed by this PRD. No app-wide canonical behavior has been promoted or declared verified. The audit identifies concrete regression risks; it cannot guarantee a future implementation will not break them.

## References

- [Keyboard implementation guide](../keyboard-input-safety-implementation.md): mechanics and earlier pilot evidence. This PRD governs proposed semantics; the guide must be reconciled during implementation, not used to infer universal footer placement.
- [React Native TextInput](https://reactnative.dev/docs/textinput): key appearance, submit behavior, selection and native multiline scrolling. Implementation must check the installed version rather than blindly adopting latest-doc APIs.
- [Apple UITextInputTraits](https://developer.apple.com/documentation/uikit/uitextinputtraits): native keyboard traits. Platform mechanics do not define Kwilt's persistence policy.
- Conversation storyboards are illustrative only: sizes, example length limits and generated keyboard geometry are not tokens or runtime evidence. Carets shown after blur in the storyboard are rendering errors.

## JTBDs served

- Audience: `audience-aspirational-family-organizers` — dependable everyday capture and correction.
- Persona: `Maya` — move family life forward with less interaction overhead.
- `jtbd-move-the-few-things-that-matter` — preserve low-friction capture and editing.
- `jtbd-capture-and-find-meaning` — keep writing and revision usable.
- `jtbd-trust-this-app-with-my-life` — preserve words and honest completion semantics.
