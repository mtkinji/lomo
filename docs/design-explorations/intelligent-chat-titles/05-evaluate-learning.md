# Evaluate Learning: Intelligent Chat Titles

## Learning questions

- Do opening titles distinguish real threads better than `New chat`?
- Do compression-time refinements feel more accurate rather than surprising?
- Do users manually rename because the generated name is wrong, or because they want personal phrasing?

## Evidence and decision rule
Use simulator/device self-use across short and long conversations. Keep the behavior if titles are specific, calm, and stable; adjust the prompt or stop compression retitling if names churn or become less recognizable. A manual rename must never be overwritten.

## Instrumentation
Use existing model/repository error reporting and direct observation. Do not add analytics containing private title text.

