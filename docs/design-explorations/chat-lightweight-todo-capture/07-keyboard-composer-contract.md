# Keyboard-open composer contract

Job: When the keyboard is open in Chat, the user needs to finish and send the thought without scanning unrelated guidance or reaching across dead space.

Primary action: Send the current message.

Must show: The draft, attachment action, voice action, and Send/Stop action.

Reveal later: Thread content remains scrollable above the composer. Normal bottom safe-area protection returns when the keyboard closes.

Must not add: A caution/disclaimer line, WKWebView’s previous/next/done form-navigation accessory, a second helper row, a duplicate keyboard inset, or controls that belong to To-do detail.

Reuse map: Keep the existing Kwilt workbench composer and its typed native bridge. Use the browser visual viewport as the keyboard boundary and React Native WebView’s supported `hideKeyboardAccessoryView` prop; do not add a native composer, custom iOS swizzle, or second keyboard-avoidance wrapper.

Behavior sources: The user’s 2026-07-22 screenshot and direction; the existing Unified Chat composer command contract; the reductive UI contract in `06-reductive-ui-contract.md`.

Unresolved decisions: None for this correction. The caution is removed from the Chat composer rather than relocated.

Required states: Keyboard closed, keyboard open, multiline draft, attachment present, voice state, working/stop state, and smallest supported iPhone viewport.

Proof path: Open the production-built Unified Chat workbench inside the signed-in iPhone 17 Pro simulator, focus the composer, enter a realistic draft, and confirm the composer is visually attached to the keyboard with no caution line, form-navigation accessory, or duplicate bottom inset.

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
