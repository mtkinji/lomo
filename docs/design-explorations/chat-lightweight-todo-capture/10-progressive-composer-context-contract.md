# Progressive composer and context contract

Job: When the user is about to ask Kwilt for help, they need a quiet place to begin and a clear view of what the next message will use once they engage, so they can speak naturally without managing page-level AI configuration.

Primary action: Write and send the next message.

Must show: A single-row resting composer with attachment on the left and voice plus Send/Stop on the right. On focus, draft, attachment, voice status, or active work, expand into a two-row composer: the draft occupies the first row and message tools occupy the second. Active context and Add context live in the second row alongside message attachments.

Reveal later: Context, attachment chips, and transient voice/work status appear inside the working composer only when the user engages or those states require attention.

Must not add: Persistent context chrome at the top of the conversation, a third toolbar row, a rectangular field treatment, a context-management step before typing, a detached floating toolbar, or duplicated context controls.

Reuse map: Draft -> one stable ShadCN-style `Textarea` that remains mounted across layout states; attachment, voice, and Send/Stop -> existing `Button` primitives and typed commands; context truth and removal -> existing workbench snapshot and `context.add` / `context.remove` bridge commands; layout transition -> CSS grid state on the existing composer.

Behavior sources: The user's 2026-07-22 direction and ChatGPT reference screenshots; the Kwilt job “Help me get useful help without retelling my life”; the existing typed native bridge; the keyboard-seam and lightweight-composer contracts.

Unresolved decisions: None. Multiple contexts and attachments remain horizontally scrollable within the second-row tool well rather than increasing composer height.

Required states: Resting empty, focused empty on the first tap, drafted, multiline, context present, attachment present, recording, transcribing, voice error, working/stop, keyboard closed, keyboard open with a 12px gap, and navigation open with the keyboard dismissed.

Proof path: Open signed-in Unified Chat on the iPhone 17 Pro simulator; confirm no context strip above the conversation; inspect the one-row resting composer; focus it and confirm a rounded two-row composer attached to the keyboard; verify context controls are inside its second row; type a multiline draft and exercise context removal/addition, voice, and Send/Stop reachability.

## Paradigm decision

Three viable directions were considered: hide context completely; show a context count only; or progressively reveal editable context inside the engaged composer. The third direction is selected. It keeps the page calm at rest while preserving scope legibility and control before the user sends.

## Reduction and runtime score

| Category | Result | Evidence |
| --- | --- | --- |
| Job clarity | PASS | The resting composer offers one obvious action: begin a message. |
| Reduction | PASS | The persistent page-level context strip and separate composer chip rows are removed. |
| Hierarchy | PASS | Resting input becomes a two-row working surface only after engagement; draft remains above tools. |
| System fit | PASS | Existing `Textarea`, `Button`, bridge commands, context records, attachments, voice, and Send/Stop behavior are retained. |
| Interaction | PASS | Focus, keyboard attachment, context visibility, context controls, typing, Send, and return to rest were exercised in the iPhone simulator. |
| States | PASS | Empty/resting, focused/contextual, drafted, working, completed, and returned-to-rest states were observed; layout tests cover other expansion triggers. |
| Resilience | PASS | Context and attachment tools scroll horizontally instead of creating a third row; right-side voice and Send remain fixed. |
| Runtime proof | PASS locally | The signed-in iPhone 17 Pro simulator used the local workbench build; production deployment remains separate. |

Runtime evidence: [`simulator-progressive-composer-resting.png`](../../delivery-evidence/unified-chat/simulator-progressive-composer-resting.png) and [`simulator-progressive-composer-engaged.png`](../../delivery-evidence/unified-chat/simulator-progressive-composer-engaged.png).
