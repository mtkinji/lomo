# Diverge: To-do Completion Undo Toast

The user has already selected the toast pattern, so divergence is limited to delivery behavior.

## A. Immediate global receipt
Show the existing light toast as soon as completion lands, with Undo available for five seconds. Best for list, Goal, and Plan surfaces where the item may move or disappear immediately. Fits the current system exactly.

## B. Post-animation receipt
Show the same toast after Activity Detail's completion animation finishes. Best where the existing visual sequence owns the first moment of feedback and the toast should not overlap it. Fits the current Detail contract.

## C. Inline pending row
Keep the row in place temporarily with an inline Undo control before moving it to Completed. This makes reversal prominent but changes list ordering semantics, adds transient row state, and does not transfer cleanly to Detail or Plan.

## Anti-pattern check
All options avoid dashboards, streak pressure, forced commitment, public sharing, and anthropomorphic AI. Option C adds avoidable state and chrome.
