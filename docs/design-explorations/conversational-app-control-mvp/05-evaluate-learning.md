# Evaluate Learning: Conversational App Control MVP

## Learning questions

- Can a user express app-control intent without learning Kwilt's object or mode vocabulary?
- Does Kwilt choose the correct capability and preserve its semantics?
- Are clarifications limited to genuinely missing information?
- Does the result reduce navigation and system maintenance?

## Evidence plan

Supporting evidence: the trash, Plan-tomorrow, and walking-Goal scenarios pass with reasonable paraphrases; saved native state matches the receipt after reload; users naturally issue another command.

Disconfirming evidence: Chat gives instructions instead of operating the app; users must name modes; Chat chooses the wrong capability, loses a referent, claims unapplied work succeeded, or creates more review work than the native screen.

## Instrumentation

Record operation id, route class, clarification count, capability outcome, correction, and undo. Do not retain raw personal prompts solely for analytics.

## Decision rule

- Proceed when the three standing scenarios and paraphrases complete reliably on a signed build.
- Simplify routing or adapters when failures cluster by capability.
- Improve contextual examples when capabilities work but are not discovered.
- Do not resume timeline polish or Phone expansion until the mobile matrix is dependable.

## Expected next action

Build Activity recurrence/reminder, Plan read/apply, and Goal-to-repeating-Activity in that order.
