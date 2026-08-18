# UI Contract: Caregiver Chores Action Dock And Editor

Job: When a caregiver notices household work, they need to capture it in one sentence, shape the resulting responsibility, and add it without leaving the Chores rhythm, so the work can become child-legible without turning setup into administration.

Authority chain: explicit user decisions in this exploration -> `brief-chores-as-recurring-activities` -> Kwilt Pattern Atlas Bottom Dock Geometry and Edit/Create pattern -> existing To-do `QuickAddDock`, `BottomDrawer`, `BottomDrawerHeader`, `BottomDrawerFooter`, `Input`, picker fields, `KwiltLoader`, and Chores review drawer -> iOS/accessibility conventions.

Three-second read: caregiver = one household routine with visible ownership, plus add a chore, review child submissions when present, or ask Chat; editor = chore identity, who it is for, when it appears, and **Add chore**.

Primary action: **Add chore** in the open editor. At rest, **Add a chore** is the primary entry.

Primary information: in the inventory, chore title, assignee identity, and cadence; in the editor, chore title, **For**, and **Repeats**.

Secondary information: **What done means**, trusted/reviewed completion, and token value only when the household token program is enabled.

Reveal later: member-specific inventory filtering, picker choices, optional completion policy, optional token value, completion history, and contextual Chat discussion.

Scan order: flat household routine -> assignment/cadence -> resting creation dock -> **New chore** identity -> required fields -> optional details -> **Add chore**.

Must not add: a preview drawer, a second confirmation, a draft inventory, a second Chore-only recurrence editor, expectation/Screen Time controls, Goal/Arc fields, priority, estimates, tags, AI field badges, blocking loading overlay, compliance alerts, or child-visible caregiver controls.

Reuse map:

- Resting and focused direct capture -> existing `QuickAddDock` component.
- AI action choices -> existing Quick Add **AI actions** menu, filtered to steps/triggers/details.
- Caregiver inventory scope -> one quiet dropdown filter for **All chores**, each child, or **Household**; no permanent child sections.
- Assigned identity -> one compact assignee pill in the metadata line so chore titles remain aligned. A named child uses the shared `ProfileAvatar`; its missing-photo fallback is a flat, muted Kwilt brand color with the first two letters of the first name. **Household** uses the same pill silhouette with a house mark instead of a person avatar.
- Review and Chat circles -> `FloatingDockActionButton` plus Canonical resting-composer geometry.
- Editor mechanics -> `BottomDrawer` and `BottomDrawerScrollView`.
- Editor heading -> `BottomDrawerHeader` titled **New chore**.
- Fixed commit -> `BottomDrawerFooter` plus one full-width `Button` labeled **Add chore**.
- Text -> `Input`.
- **For** -> `SmallSetPickerField`; **Repeats** -> the existing To-do preset/custom repeat sheets and formatter, with **Off** translated to **One time**.
- AI progress -> `KwiltLoader` with `Adding details…`, `accessibilityLiveRegion="polite"`, and busy semantics.
- Completion policy -> existing settings/picker primitives; no custom switch anatomy.
- Child requests -> existing `ChoreReviewDrawer` opened from the conditional full-circle action.
- Contextual help -> existing `UnifiedChatDrawer` only when Chores can be represented as truthful bounded context.

Nearest precedent: To-do Quick Add supplies the exact capture component and AI-action grammar, and To-do detail supplies the recurrence types, formatter, preset sheet, custom cadence sheet, and one-active-occurrence lifecycle. The Chore difference is its submit destination: To-dos commits immediately, while Chores opens the actual editor because participation and recurrence affect another person. Chore detail/review drawers supply capability-local language and evidence hierarchy, but the creation drawer is an editor—not a review preview.

External exemplar ledger: N/A.

Behavior sources:

- Direct component reuse and editor-on-submit -> explicit user decision, 2026-08-18.
- Non-blocking spinner while AI runs -> explicit user decision, 2026-08-18.
- Activity-backed identity and household policy -> Chores system design and feature brief.
- Conditional review action -> accepted parent-creation exploration.
- Chat cannot publish -> Unified Chat reviewed-write and Chores boundary contracts.

Unresolved decisions: production contextual Chat draft handoff remains gated on a household-authorized Chores capability contract. The Labs slice may open truthful contextual Chat, but it must not claim draft creation if the typed handoff is not implemented.

Required states:

- Child projection: no dock.
- Caregiver resting: direct composer + Chat; no review action at zero.
- Caregiver resting with submissions: direct composer + factual review count + Chat.
- Focused Quick Add: keyboard open; **Clarify done**, **Set a routine**, and **Add steps** map to the shared details/triggers/steps operations; no cover-image option.
- Caregiver routine: completed occurrences retain their cadence in the inventory; only actionable exceptions such as **Waiting for review** or **Needs another pass** replace cadence.
- Editor opened before AI returns: all fields editable; compact loader and **Adding details…** visible.
- Editor partially enriched: only untouched fields change; loader remains until the request settles.
- Editor enriched: loader disappears without shifting the primary action or adding a success card.
- AI unavailable/failed: safe editable values remain; no blocking error.
- Parent edits during enrichment: touched value remains authoritative.
- Parent saves during enrichment: current values commit; late response is ignored.
- Parent dismisses during enrichment: no record or draft remains; late response is ignored.
- Tokens off/on.
- Assigned child/Household.
- As needed/daily/weekdays/weekly.
- Trusted completion/caregiver review.
- One/many review requests.
- Long title, long definition, Dynamic Type, keyboard, reduced motion, and screen-reader traversal.

Proof path: Settings -> Kwilt Labs -> Chores on iPhone 17 Pro / iOS 26.5 Simulator. Reset the local sample when needed so its submitted Charlie chore exposes the review action and drawer. Switch to caregiver; inspect the compact safe-area dock, all/child/Household filters, avatar/cadence rows, and zero/one/many review states; open Quick Add; submit representative input; verify the editor opens before delayed AI resolves; edit fields during the loader; save and dismiss during delayed enrichment; inspect child projection; reopen caregiver view; open contextual Chat if truthful Chores launch context is available. Capture resting, focused, loading, enriched, failure, saved, and review states. Physical-device, Android, VoiceOver hardware use, TestFlight, production Household, and backend proof remain separate.
