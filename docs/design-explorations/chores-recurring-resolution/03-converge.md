# Converge: Two Explicit Outcomes

## Chosen direction

Use the existing Activity recurrence basis as a progressive caregiver choice:

- **Start fresh next time** (`scheduled`) closes stale occurrences as missed and materializes the current or next scheduled occurrence without backfilling copies.
- **Keep open until done** (`after_completion`) keeps one occurrence actionable and schedules the next relative to completion.

## Capability delta

Today, an uncompleted Chores occurrence can remain stale because the local adapter advances only after completion or approval.

After this release, time passing resolves scheduled routines without creating a backlog, while a caregiver can deliberately keep persistent work open until it is actually done.

Still unsupported: simultaneous owed copies, penalties, automatic exemptions, and child-managed recurrence policy.

## Reductive decisions

- Reuse `repeatBasis`; add no second miss-policy field.
- Show the choice only when a chore repeats.
- Keep missed facts out of the current child list and all completion/reward ledgers.
- Remove token balance from the fixed footer; retain it in **How my chores work**.
- Replace the completed footer contradiction with **You're caught up** and a truthful benefit-input statement.
- Reveal correction only when the current assigned chore has a missed occurrence in the current calendar week.
- Use **I did this yesterday** for the single-yesterday case and **I did this on another day** when several dates are eligible.
- Let the child submit several dated correction requests together, but keep caregiver resolution occurrence-by-occurrence in the existing review queue.
- A correction records the scheduled day and request/review times; it never invents an exact performance time or advances recurrence again.

## Bet

We're betting that two one-copy outcomes cover ordinary household recurrence without making children manage debt. If real households need separately owed occurrences, revisit that as a narrow advanced policy with explicit evidence.
