# Keyboard & Input Safety — Implementation Guide

This doc is the **engineering playbook** for ensuring the software keyboard **never covers an active input** anywhere in the app.

- Product requirements live in: `docs/feature-briefs/keyboard-input-safety.md`
- Core primitives involved:
  - `src/ui/layout/CanvasScrollView.tsx`
  - `src/ui/layout/CanvasFlatList.tsx`
  - `src/ui/KeyboardAwareScrollView.tsx`
  - `src/ui/BottomDrawer.tsx`
  - `src/ui/Dialog.tsx`

---

## Principles (what owns what)

### Inputs and hosts cooperate; the host owns layout

Keyboard safety is primarily **layout + scroll** behavior. Input primitives (`Input`, `EditableField`, inline adapters) cannot independently guarantee visibility because they don’t know:

- whether their parent is scrollable
- what safe-area / sticky footer offsets exist
- whether they live in a modal/sheet/portal/transformed surface

Therefore, **keyboard safety lives in containers**: screens, scroll containers, and sheets.

The canonical `Input` registers its whole field frame with the nearest cooperating host on focus. This covers basic single-line values as well as paragraphs, without adding input-owned keyboard padding. Explicit composite reveal targets (such as a tag group) retain priority over the inner field. The host discards stale measurements after focus changes, dismissal, unmount or a deliberate drag.

---

## Standard patterns (use these)

### 1) Regular screens: use canvas scroll containers by default

- Use `CanvasScrollView` / `CanvasFlatList` for standard canvas scrolling.
- Keep `automaticallyAdjustKeyboardInsets={true}` (default in these adapters).
- If you have a sticky footer/composer, add `extraBottomPadding` so content can scroll above it.

### 2) Forms (multiple inputs, bottom-of-screen fields): use `KeyboardAwareScrollView`

Use `KeyboardAwareScrollView` for ordinary editable screen forms, including forms with only one field near the bottom. `SettingsPage` now supplies this host by default:

- adds safe bottom padding + keyboard-height padding
- reveals the complete registered field using measured window geometry and the current scroll offset; only scrolls when it is outside the visible bounds
- follows focus switches and keyboard-height/frame changes; reads existing keyboard metrics when mounted after keyboard opening
- keeps handled controls tappable while editing

The `Input` frame does not replace a surrounding feature action. Keep Save/Add/Post ownership with the feature. For a row containing a field and an action, place layout flex on `Input.wrapperStyle`, not its inner `containerStyle`.

This is the “never covered” default for most forms.

The September 10 Areas regression migrated Areas, Phone Agent settings, Chapter detail, Meal Plan editor, Meal Choice response, Recipe completion, Recipe import, Recipe editor and Money category creation to this host. Recipe editor/import retired their separate `KeyboardAvoidingView` when adopting it. See [source and native evidence](design-system/evidence/input-keyboard-safety/README.md). The AST policy catches direct/native or traced local fields under a plain native scroll view; this is a regression net, not proof of every runtime composition or platform. Chat and game-seat custom hosts retain exact, reasoned exceptions pending their separate runtime acceptance.

### 3) Sheets / bottom drawers: choose one explicit keyboard relationship

`BottomDrawer` wraps its overlay with `KeyboardAvoidingView` so the entire sheet lifts above the keyboard.

For editable drawers that should remain visually attached to the bottom edge, use:

- `keyboardBehavior="extend"` on `BottomDrawer`
- `BottomDrawerScrollView` with `automaticallyAdjustKeyboardInsets` around the editable/scrollable content

This keeps the sheet spatially stable and continuing underneath the keyboard while iOS adjusts the scrollable viewport around focused fields. Do not use a plain `ScrollView` or nest `KeyboardAwareScrollView` inside an `extend` drawer; its manual focus-scrolling can over-correct inside modal sheet coordinates.

For full-height task drawers that combine a scrollable form with a fixed footer action, use:

- `keyboardBehavior="resize"` on `BottomDrawer`
- `BottomDrawerScrollView` around the editable form
- `footer` for the persistent submit action

This keeps the sheet's top edge fixed, reduces only its internal content area above the keyboard, and preserves the footer as a stable action dock. Use it when `lift` would push a full-height drawer header off-screen and `extend` would leave the footer beneath the keyboard.

`BottomDrawerScrollView` reveals the focused field within that reduced body,
including after keyboard-height and field-size changes. The shared `Input`
bounds its multiline height to the space the container supplies, then lets the
native text view scroll longer text. The drawer applies the phone safe area only
at the device edge; above the keyboard it keeps the canonical minimum gap.
Do not add automatic keyboard insets, a second keyboard wrapper, or local footer
clearance to a `resize` drawer. Custom oversized/raw text editors still require
their own native verification; importing the drawer alone does not certify them.

The named completion action (Save, Post, Create) stays in the footer while editing
and works on the first tap. Return inserts a newline in multiline fields;
dismissing the keyboard does not submit the task. Saving, validation, failure,
retry, and draft preservation belong to the existing feature persistence contract.
This does not change inline editors into autosaved fields or certify every route.

#### Special-case: Agent chat inside a drawer

`AiChatScreen` (hosted by `AgentWorkspace`) implements its own keyboard strategy because it can be mounted inside transformed sheet surfaces:

- listens for keyboard show/hide
- tracks iOS keyboard frame changes (QuickType/predictive bar, emoji keyboard, dictation) so keyboard height doesn’t go stale
- pads transcript scroll content and scrolls focused inline inputs into view

If you are hosting **Agent chat** inside `BottomDrawer`, set:

- `keyboardAvoidanceEnabled={false}`

…to avoid double-lifting/double-padding (BottomDrawer + chat both adjusting).

Also pass `hostBottomInsetAlreadyApplied={true}` into `AgentWorkspace` (or rely on `useAgentLauncher`, which sets this automatically). This tells `AiChatPane` to subtract `insets.bottom` from iOS keyboard heights so it doesn’t double-count the home-indicator area when the sheet already includes safe-area padding.

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
- In Agent chat (iOS): toggle QuickType bar / emoji keyboard while an input is focused: no big gaps, no jump-off-screen.
- In a task drawer: type beyond the textarea height, switch to the taller emoji
  keyboard, and type again. The final line/caret and footer action must both stay
  visible. Move to an earlier line and repeat. Verify at the smallest supported
  viewport and larger text sizes before claiming support for those configurations.

## Pilot evidence — 2026-09-10

The pilot uses the real Share a moment drawer and existing shared components;
there is no separate app, lab route, or new dependency. These checks establish a
drawer implementation candidate, not app-wide native acceptance.

| Existing surface | Native observation | Remaining acceptance |
| --- | --- | --- |
| Share a moment task drawer | Post remains visible; multiline typing and the taller emoji keyboard keep the final line/caret above the footer. | Smallest supported viewport, larger text, earlier-line selection, photo fields, and physical device. Publication was not exercised. |
| To-do detail inline fields | Lower step field and Done are visible with the keyboard. | Existing long-title editing can overlap the floating header/status area; the full-screen container needs its own correction and proof. |
| To-do Notes rich-text editor | Existing Done and formatting controls remain visible on focus. | Long-text selection and keyboard-height changes in its WebView. |
| Chat about to-dos | Editor could not be reached: the existing load-error screen persisted after retry. | Native composer and inline-card keyboard checks remain open. |

Simulator provenance: `/Users/andrewwatanabe/Kwilt`, branch `main`, base commit
`9baf1a4a8e14b83e806c1df9e25ee4d3e66d0678`, with existing uncommitted work plus this
pilot. Metro on port 8081 served that checkout to iPhone 17 Pro, iOS 26.5. The
installed development client was 1.0.118 (118); no new native build, TestFlight,
Android, or physical-device acceptance is implied.

Before app-wide promotion, verify each container family against the same visible
cursor, reachable completion action, first-tap, keyboard transition, and text-size
criteria. Existing publication/retry tests cover persistence separately; a native
layout screenshot cannot establish successful saving.
