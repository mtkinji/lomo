# Evaluate Learning: Shared Content Home

## Learning questions

- Does Home read as a place for shared content rather than a notification queue?
- Can a recipient identify sender, object, and action without opening the card?
- Does the compact **Needs you** section help without dominating the surface?
- Does opening the authoritative Goal feel continuous?
- Can another capability adopt the same envelope without weakening its access model?

## Evidence plan

Supporting evidence:

- two-account proof of authored check-in to exact-recipient Home appearance;
- unprompted description of Home as “things shared with me”;
- successful navigation from Home to the correct Goal;
- no duplicate item after retry;
- no wrong-account or anonymous read.

Disconfirming evidence:

- Home is still described as notifications;
- card content lacks enough object context;
- check-ins feel duplicated or noisy outside their Goal;
- users expect to reply inline and find the capability handoff confusing.

## Instrumentation

Extend existing Shared Home analytics only with event kind, capability, state, entry source, and navigation success. Do not record sender names, Goal titles, check-in text, recipients, or relationship labels.

## Decision rule

After the two-account TestFlight proof and several real check-ins, proceed if Home is understood without coaching and used to reopen at least one shared Goal. Revise the card grammar if it reads as an alert. Retire rich check-ins from Home if they create duplication without retrieval value.

## Expected next action

If the envelope holds, design Explore’s explicit share authority and its capability-level **Shared with me** collection as the second rich-content adapter.
