# Converge: Typed local-first task router

Choose option C.

The first implementation has three routes:

1. `authored` for a deliberately tiny set of greetings and acknowledgements;
2. `apple_foundation_models` for explicit, self-contained rewrite, proofreading, shortening, summarization, and small ideation requests;
3. `cloud` for everything else and as automatic fallback.

The local provider receives only the user's current self-contained prompt plus task instructions. It never receives Chat history, private evidence, attachments, capability tools, or current-information requests in this slice.

Trade-off: eligible local prompts are intentionally narrow, so the initial cost reduction is smaller than a broad replacement. The bet is that reliable routing and truthful fallback create a safe base for widening eligibility from measured dogfood evidence.
