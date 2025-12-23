## PRD — Keyboard & Input Safety (MVP Launch)

### Purpose

Ensure the keyboard **never covers the user’s active input** and users can always complete text entry flows comfortably. This is a launch quality bar and a trust issue.

### References

- Launch plan: `docs/launch/mvp-app-launch-jan-1-2026.md`
- Keyboard-safe primitives:
  - `src/ui/layout/CanvasScrollView.tsx`
  - `src/ui/layout/CanvasFlatList.tsx`
  - `src/ui/KeyboardAwareScrollView.tsx`
- Input-heavy screens:
  - `src/features/activities/ActivityDetailScreen.tsx`
  - `src/features/goals/GoalsScreen.tsx` (GoalCoachDrawer)
  - `src/features/ai/AiChatScreen.tsx`

---

## Current state

The app now has a consolidated keyboard-safety approach via dedicated primitives (e.g. `KeyboardAwareScrollView`, plus screen/sheet patterns). Key input-heavy screens have been migrated to these patterns to prevent the keyboard from obscuring active fields.

Remaining work is primarily **validation** (device QA across sizes + iOS versions) and tightening any one-off regressions as they appear.

---

## MVP requirements

### Functional requirements

- When a text input is focused:
  - The caret and the line being edited remain visible.
  - The user can scroll content such that the focused field is above the keyboard.
- Tapping outside inputs dismisses keyboard where appropriate.
- `keyboardShouldPersistTaps` is set so controls remain usable while keyboard is open.

### Standard patterns (preferred)

- Use `CanvasScrollView` / `CanvasFlatList` for screen-level scroll containers.
  - Keep `automaticallyAdjustKeyboardInsets={true}`.
  - Add safe bottom padding via `extraBottomPadding` when there is a sticky footer.
- For modal sheets with inputs, use the existing keyboard-aware wrapper or a dedicated pattern for bottom sheets.

---

## Target surfaces (MVP)

### 1) Activity Detail

- Title inline editing
- Notes textarea
- Add step inline input
- Bottom sheets (reminder/due/repeat/estimate)

### 2) Goal creation / editing

- GoalCoachDrawer manual form
- Editable fields in Goal detail

### 3) AI Chat

- Composer input
- Dictation controls + scrolling transcript

---

## Acceptance tests (manual)

Run on iPhone (small screen) and iPhone Pro Max (large screen):

- Focus the last input on the page: the field remains visible.
- Focus an input near the bottom: screen scrolls enough to keep it visible.
- With keyboard open, tap a button in the scroll area: it still works.
- Switch between inputs quickly: no layout thrash or stuck scroll.

---

## Long-term strategy

- Consolidate on a single keyboard-safe container strategy across the app shell/canvas layers.
- Add a lightweight “Keyboard safety checklist” to PR reviews for any new form or sheet.


