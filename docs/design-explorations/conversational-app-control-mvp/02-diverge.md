# Diverge: Conversational App Control MVP

## Axis of variation

Where interpretation lives and how directly it reaches existing capability operations.

## Alternative A — Per-capability command parsers

Each capability owns a deterministic parser in addition to its executor. This fits predictable commands but repeats interpretation logic and handles cross-capability follow-ups poorly.

## Alternative B — General model with unrestricted tools

Expose every operation and let the model choose and execute freely. This feels most like a general AI assistant but gives too much authority over intimate, external, or destructive changes.

## Alternative C — One interpreter, capability-owned operations

Use one semantic interpreter to translate ordinary language into registered operations. The registry selects the capability-owned reader, validator, permission rule, executor, result, and undo. Deterministic routing remains only for high-confidence shortcuts.

This honors the four-object model, capture-first behavior, and proportionate control. It fails honestly when an operation is missing instead of producing an unrelated answer.

## Recommendation

Choose Alternative C. It provides broad interpretation without moving domain truth into the model. Reduce the implementation to a mobile command matrix before resuming Phone Agent or timeline work.
