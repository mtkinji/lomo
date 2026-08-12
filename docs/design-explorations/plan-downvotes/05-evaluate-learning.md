# Evaluate Learning: Plan downvotes

## Learning questions

- Do people understand downvote as “not for me,” not “remove this”?
- Does naming participants keep the signal constructive or make it socially harder?
- Can the organizer use mixed positive and negative input without expecting majority rule?
- Do members continue nominating recipes after receiving a downvote?

## Evidence

Supporting evidence:

- users toggle or replace responses without explanation;
- an organizer cites both signals when choosing a subset;
- nomination and positive-reaction activity continues.

Disconfirming evidence:

- users expect a downvote to remove or block a recipe;
- family members avoid nominating after visible disagreement;
- users ask for anonymous or hidden votes;
- a combined score is assumed despite separate counts.

## Instrumentation

For the learning release, use manual household observation and existing mutation
logs. Do not capture reasons, infer sentiment, or build member-level engagement
analytics for this question.

## Decision rule

- Keep signed downvotes if multi-account use is understood and non-punitive.
- Move to private “not for me” if the signal is useful but visibility causes friction.
- Remove downvotes if they do not improve the shopping decision or reduce nominations.
