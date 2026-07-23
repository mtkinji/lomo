# Evaluate Learning: Chat Turn-Coherent Timeline

## Learning questions

- Does the timeline read naturally without visible turn labels or explanation?
- Can the user immediately identify which request owns Working, evidence, a proposal, and a receipt?
- Does causal within-turn ordering feel more truthful than raw timestamps?
- Does a correction echo help when an old artifact changes, or does it feel duplicative?
- Does the latest-turn scroll behavior preserve both continuation and deliberate reading of older history?
- Can Kwilt and Giraffed share the ordering semantics without forcing the same visual shell?

## Supporting evidence

- In a resumed thread, every new prompt appears after all visible artifacts from prior turns.
- The active Working item is the last timeline artifact and is directly adjacent to its request.
- Completion fills the active turn without moving another turn.
- The user can point to the request that produced each evidence, proposal, and receipt artifact without opening diagnostics.
- Immediate same-turn Undo feels like a state update; delayed Undo after later turns produces one useful, compact acknowledgement.
- Returning from native To-do detail restores the same turn and reading position.
- Voice, multiline text, attachment, retry, stop, and steer preserve the same turn invariants.

## Disconfirming signals

- Users look above the current prompt for the Working state or newest result.
- Evidence appears to support the wrong answer or proposal.
- Completed artifacts jump when optimistic records reconcile.
- Correction echoes feel like duplicate receipts or create an activity-feed impression.
- Long turn blocks make the newest prompt difficult to reach.
- The renderer needs guessed timestamps or ownership to place valid records.

## Instrumentation

- Add deterministic tests that validate every visible artifact is assigned to exactly one ordered turn.
- Add a renderer regression fixture containing: completed message/answer/evidence/proposal/receipt, a later user message, and an active run.
- Add fixtures for standalone messages, failed runs, retry, stop, steer, applied create receipts, update proposals, immediate Undo, and delayed Undo.
- Capture signed-in simulator screenshots for resumed, active, completed, and delayed-correction states.
- Exercise the same flows on a physical iPhone through TestFlight.
- Use developer-only orphan/duplicate projection diagnostics.
- Do not record prompt text, transcript audio, evidence content, or private object labels for this learning question.

## Decision rule

Accept the turn model when all ordering invariants pass automatically and Andrew can complete the physical-device scenarios without identifying a misplaced artifact, scroll jump, or ambiguous correction. If grouping is unclear but order is correct, improve spacing or local attachment cues. If correction echoes feel duplicative, restrict them to actions initiated from a non-latest turn. If ownership cannot be derived without guesses, extend the protocol rather than falling back to timestamp sorting.

## Expected next action

If accepted, remove the temporary type-bucket fallback after compatible native builds have aged out, update the Unified Chat job-flow evidence, and carry the headless turn contract into Giraffed's renderer separately.
