# Keyboard & Input Safety — Implementation Guide

This doc is the **engineering playbook** for ensuring the software keyboard **never covers an active input** anywhere in the app.

- Product requirements live in: `docs/prds/keyboard-input-safety-prd.md`
- Core primitives involved:
  - `src/ui/layout/CanvasScrollView.tsx`
  - `src/ui/layout/CanvasFlatList.tsx`
  - `src/ui/KeyboardAwareScrollView.tsx`
  - `src/ui/BottomDrawer.tsx`
  - `src/ui/Dialog.tsx`

---

## Principles (what owns what)

### Inputs do **not** own keyboard safety

Keyboard safety is primarily **layout + scroll** behavior. Input primitives (`Input`, `EditableField`, `EditableTextArea`, raw `TextInput`) cannot reliably guarantee visibility because they don’t know:

- whether their parent is scrollable
- what safe-area / sticky footer offsets exist
- whether they live in a modal/sheet/portal/transformed surface

Therefore, **keyboard safety lives in containers**: screens, scroll containers, and sheets.

---

## Standard patterns (use these)

### 1) Regular screens: use canvas scroll containers by default

- Use `CanvasScrollView` / `CanvasFlatList` for standard canvas scrolling.
- Keep `automaticallyAdjustKeyboardInsets={true}` (default in these adapters).
- If you have a sticky footer/composer, add `extraBottomPadding` so content can scroll above it.

### 2) Forms (multiple inputs, bottom-of-screen fields): use `KeyboardAwareScrollView`

Use `KeyboardAwareScrollView` when a screen/sheet is collecting text and you want the “premium” behavior:

- adds safe bottom padding + keyboard-height padding
- **best-effort scrolls the focused input into view** via
  `scrollResponderScrollNativeHandleToKeyboard`

This is the “never covered” default for most forms.

### 3) Sheets / bottom drawers: `BottomDrawer` is keyboard-safe by default

`BottomDrawer` wraps its overlay with `KeyboardAvoidingView` so the entire sheet lifts above the keyboard.

#### Special-case: Agent chat inside a drawer

`AiChatScreen` (hosted by `AgentWorkspace`) implements its own keyboard strategy because it can be mounted inside transformed sheet surfaces:

- listens for keyboard show/hide
- pads transcript scroll content and scrolls focused inline inputs into view

If you are hosting **Agent chat** inside `BottomDrawer`, set:

- `keyboardAvoidanceEnabled={false}`

…to avoid double-lifting/double-padding (BottomDrawer + chat both adjusting).

### 4) Dialogs: `Dialog` is keyboard-safe

`Dialog` uses a `KeyboardAvoidingView` so dialogs that include form fields don’t get covered.

---

## Do / Don’t (anti-patterns)

- **Do**: pick exactly one container strategy for a surface:
  - `CanvasScrollView/CanvasFlatList` (simple screens)
  - `KeyboardAwareScrollView` (forms)
  - `BottomDrawer` (sheets; optionally opt-out for Agent chat)

- **Don’t**: wrap individual inputs in `KeyboardAvoidingView`.
  - This almost always produces inconsistent behavior across screens.

- **Don’t**: stack multiple independent keyboard strategies in the same surface.
  - Example: `BottomDrawer` keyboard avoidance + a nested `KeyboardAvoidingView` + manual keyboard-height padding.
  - If you need a special-case, opt one layer out explicitly (e.g. `keyboardAvoidanceEnabled={false}`).

---

## PR checklist (copy/paste)

When adding or editing any text input:

- The input is inside one of:
  - `KeyboardAwareScrollView`
  - `CanvasScrollView` / `CanvasFlatList` (and tested on small screens)
  - a `BottomDrawer` / `Dialog` that is known keyboard-safe
- The last input on the surface can be focused without being covered.
- Taps still work while the keyboard is open (`keyboardShouldPersistTaps` / defaults).
- No redundant keyboard handlers (avoid nested `KeyboardAvoidingView` unless explicitly justified).

---

## Manual test recipe (quick)

Run on a small iPhone simulator/device:

- Focus the last input in a form: field remains visible.
- Switch between two inputs while keyboard stays open: no “stuck under keyboard”.
- In a sheet: focus an input near the bottom: it lifts/scrolls above keyboard.
- In Agent chat: focus an inline card input while keyboard is already open: it scrolls into view.


