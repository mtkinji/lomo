# Converge: Intelligent Chat Titles

## Chosen direction
Lifecycle-aware model naming.

- After the first completed exchange, generate a plain 3–7 word title in the background.
- When conversation compression produces a new summary, allow that same understanding to suggest a refined title.
- Persist `default`, `generated`, or `user` title ownership. Automated writes may replace only `default` or `generated` titles; manual rename sets `user` and wins permanently.
- Reject empty, generic, quoted, overlong, or malformed suggestions and leave the current title unchanged.

## Reductive decisions
Add no naming prompt, spinner, notification, setting, title history, or per-turn retitling. A title update quietly appears in the header and thread list.

## Bet and success signal
We're betting that naming at two meaningful lifecycle moments makes threads recognizable without feeling unstable. Revisit the compression threshold or title prompt if names stay generic or drift away from the thread's durable purpose.

