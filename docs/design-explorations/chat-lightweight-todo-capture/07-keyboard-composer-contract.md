# Keyboard-open composer contract

Job: When the keyboard is open in Chat, the user needs to finish and send the thought without scanning unrelated guidance or reaching across dead space.

Primary action: Send the current message.

Must show: The draft, attachment action, voice action, and Send/Stop action, with a quiet 12px separation from the keyboard.

Reveal later: Thread content remains scrollable above the composer. Normal bottom safe-area protection returns when the keyboard closes.

Must not add: A caution/disclaimer line, WKWebView’s previous/next/done form-navigation accessory, a second helper row, a duplicate keyboard inset, a green focus ring, or controls that belong to To-do detail.

Reuse map: Keep the existing Kwilt workbench composer and its typed native bridge. Use the browser visual viewport as the keyboard boundary and React Native WebView’s supported `hideKeyboardAccessoryView` prop; do not add a native composer, custom iOS swizzle, or second keyboard-avoidance wrapper.

Behavior sources: The user’s 2026-07-22 screenshots and direction, including the later request for neutral focus styling and 8–16px keyboard separation; the existing Unified Chat composer command contract; the reductive UI contract in `06-reductive-ui-contract.md`.

Unresolved decisions: None for this correction. The caution is removed from the Chat composer rather than relocated.

Required states: Keyboard closed, keyboard open, multiline draft, attachment present, voice state, working/stop state, and smallest supported iPhone viewport.

Proof path: Open the production-built Unified Chat workbench inside the signed-in iPhone 17 Pro simulator, tap the resting composer once, and confirm the same textarea expands without losing focus; verify the keyboard opens on that first tap, the composer has a 12px keyboard gap and neutral graphite focus treatment, and opening the global menu dismisses the keyboard.

## Reduction and runtime score

| Category | Result | Evidence |
|---|---|---|
| Job clarity | PASS | Draft and Send remain the dominant interaction. |
| Reduction | PASS | The caution line and duplicate keyboard-open safe-area inset are removed. |
| Hierarchy | PASS | Composer forms one continuous unit with the iOS keyboard; only the normal QuickType suggestion strip remains. |
| System fit | PASS | Existing workbench composer and native WebView bridge are retained. |
| Interaction | PASS | Attachment, voice, draft, and Send remain reachable in the focused state. |
| States | PASS | Keyboard-closed and keyboard-open layout were operated; multiline sizing remains bounded by the existing composer. |
| Resilience | PASS | The browser visual viewport drives height and offset; a tested threshold ignores small viewport fluctuations. |
| Runtime proof | PASS locally | [`simulator-keyboard-composer-attached.png`](../../delivery-evidence/unified-chat/simulator-keyboard-composer-attached.png) records the production-built local workbench inside the signed-in iPhone 17 Pro simulator with the WebView form-navigation accessory absent. Production deployment remains a separate gate. |
