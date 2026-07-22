# Lightweight composer visual contract

Job: When the user has a thought to capture in Chat, they need a quiet place to type and send it without the composer competing with the conversation.

Primary action: Send the current message.

Must show: Attachment on the left; draft in the flexible center; voice and Send/Stop anchored together as the persistent right-hand action cluster. Show a small live status only while recording, transcribing, reporting a voice error, or working.

Reveal later: Attached-document chips appear only after attachment. Multiline height grows only as the draft requires it.

Must not add: A floating-card treatment, heavy shadow, oversized radius, persistent keyboard-shortcut hint, separate toolbar row, or background seam above the iOS keyboard.

Reuse map: Compose the existing ShadCN-style `Textarea` and `Button` primitives with Kwilt's `canvas`, `card`, `border`, `muted`, `primary`, radius, and focus-ring tokens. Keep the existing typed native bridge and composer commands.

Behavior sources: The user's 2026-07-22 screenshot and direction; the keyboard-open contract in `07-keyboard-composer-contract.md`; ShadCN's compact New York input/button grammar; the existing Unified Chat command contract.

Unresolved decisions: None. This refinement changes visual containment and responsive layout, not composer capabilities or message behavior.

Required states: Empty, drafted, multiline, attachment present, recording, transcribing, voice error, working/stop, disabled Send, keyboard closed, and keyboard open.

Proof path: Open Unified Chat in the signed-in iPhone 17 Pro simulator, focus the composer, type a realistic multiline draft, and confirm that the composer sits against the keyboard as a compact input group with no exposed background seam or extra toolbar row.

## Reduction and runtime score

| Category | Result | Evidence |
|---|---|---|
| Job clarity | PASS | Draft and Send remain the dominant interaction. |
| Reduction | PASS | The persistent helper footer, gradient backing, large radius, and elevated card shadow are removed. |
| Hierarchy | PASS | Attachment, draft, voice, and Send form one compact row; status appears only when active. |
| System fit | PASS | The composer now composes the existing ShadCN-style `Textarea` and `Button` primitives with Kwilt tokens. |
| Interaction | PASS | Focus, realistic typing, wrapping, QuickType, voice, attachment, and Send remained reachable in the simulator. |
| States | PASS | Empty, focused, drafted, and wrapped keyboard-open states were operated; existing tests cover working and command behavior. |
| Resilience | PASS | The input grows to two lines without displacing controls or adding a second toolbar. |
| Runtime proof | PASS locally | [`simulator-lightweight-composer.png`](../../delivery-evidence/unified-chat/simulator-lightweight-composer.png) records the signed-in iPhone 17 Pro simulator with the keyboard open and a wrapped draft. Production deployment remains separate. |
