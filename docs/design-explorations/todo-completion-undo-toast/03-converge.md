# Converge: To-do Completion Undo Toast

## Chosen direction
Use one global light toast with a five-second Undo action. Show it immediately on compact completion surfaces and after the existing completion animation on Activity Detail.

## Capability delta
Today, a user can complete a to-do, but acknowledgement is inconsistent and the item may leave the current list without an obvious recovery path.

After this release, every primary in-app completion path produces the same reversible receipt. Long-lived history and reversal of already-fired external effects remain unsupported.

## Reduction decisions
- Reuse `ToastHost`, `Toast`, and the existing deletion-toast grammar.
- Add no modal, setting, second confirmation, custom snackbar, or completion-history screen.
- Keep one message and one action: `To-do complete` and `Undo`.

## Activation
Organic and contextual: the affordance appears only after the user completes a to-do. No education is needed.

## Trade-offs
Undo restores the Activity's completion state. It does not retract celebrations, sounds, analytics events, Screen Time progress, partner signals, or already-queued check-in prompts.

## Bet
We're betting that a short, consistent, reversible receipt gives users enough confidence without slowing completion. If it proves noisy, revisit duration or suppress it where a higher-priority completion moment already communicates recovery clearly.

## Success signal
A completion can be reversed from the toast on each primary completion surface, and stale Undo actions do not overwrite a later completion.
