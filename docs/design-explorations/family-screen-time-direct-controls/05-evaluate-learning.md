# Evaluate Learning: Family Screen Time Direct Controls

## Questions

- Does one-time selection setup make later Chat commands feel effectively immediate?
- Are action, children, and expiry enough for confident approval?
- Do multi-child partial failures remain understandable?
- Do block and allow expiry reliably restore the correct compiled state?
- Do caregivers understand elapsed access versus foreground-usage time?
- Is direct temporary blocking used enough to strengthen activation, retention, and willingness to pay?

## Evidence

Supporting evidence:

- the example command reaches an approved proposal without settings navigation after initial setup;
- both child devices apply block and allow versions and expire them locally while offline;
- Maya can inspect or cancel without remembering where the control was created;
- repeated use occurs for a small saved set of selections.

Disconfirming evidence:

- most requests require a new picker handoff;
- caregivers frequently correct child or expiry scope;
- batch failures or overlapping policies create false **On/Off** copy;
- families treat direct control as punitive or use it instead of understandable standing agreements.

## Instrumentation

Track bounded operation kind, child count, saved-selection resolution outcome, proposal outcome, per-device receipt state, expiry path, cancellation, and latency class. Do not track opaque tokens, installed-app inventory, browsing, messages, location, or raw usage history.

## Decision rule

Proceed when two-child signed-device testing proves apply, offline expiry, cancellation, and policy restoration, and repeated use shows the one-time picker cost is amortized. Simplify to category-only controls if app-specific setup dominates. Hold monetization claims until entitlement, authority, device application, and expiry are separately proven.
