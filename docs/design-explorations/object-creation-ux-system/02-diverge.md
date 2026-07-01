# Diverge: object-creation-ux-system

## Axis

Shared grammar vs specialized speed.

## Option A: One Universal Creation Flow

Every creation entry point uses the same deterministic questionnaire and then decides whether to create an Arc, Goal, or both. This maximizes consistency, but it risks making later Goal creation feel too slow and over-explained.

Best when: the biggest blocker is confusion about object meaning.

Fails when: users already know they want a Goal and need fast capture.

## Option B: Shared Grammar, Different Lenses

FTUX, direct Goal creation, and direct Arc creation share a canonical question grammar, but each flow exposes a different subset. FTUX asks the full concrete-to-identity path. Direct Goal creation asks focus, goal shape, timeframe, and only enough Arc/meaning context to attach it well. Direct Arc creation supports identity-first and activity-to-identity starts.

Best when: the goal is dependable UX without unnecessary ceremony.

Fails when: the shared grammar is not documented or tested, causing drift anyway.

## Option C: Smart Routing From One Prompt

All creation begins with one open prompt. Kwilt classifies the input and routes the user into a Goal-first, Arc-first, or Goal+Arc path. This feels magical when correct, but requires stronger inference, transparent correction, and more failure handling.

Best when: the product can reliably infer intent and recover gracefully.

Fails when: inference errors make the app feel like it does not understand the user.

## Option D: Keep Flows Separate, Add Better Copy

FTUX, direct Goal creation, and direct Arc creation keep separate flows. Each gets improved copy and local validation. This is fastest, but it does not answer the system-level concern.

Best when: launch risk is high and no cross-flow change can be safely absorbed.

Fails when: users encounter multiple creation flows and feel different product philosophies.

## Anti-pattern check

Avoid productivity-app voice, scorecards, forced commitment, and teaching taxonomy before value. Creation should feel like guided shaping, not a form.
