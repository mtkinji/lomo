# Frame: Chores Capability

## What the user said

> It's time to start exploring a "Chores" capability in Kwilt.

## Restated in user voice

When household responsibilities repeat and the reminding falls back on one person, Maya wants each family member to see what is theirs today and carry it through without being managed step by step, so the home develops a calmer rhythm of shared ownership. The experience must be substantially simpler than adult To-dos even if it initially reuses some Activity infrastructure underneath.

## Target audience

`audience-aspirational-family-organizers` — families who want ordinary life to feel more organized without adopting a productivity methodology.

## Representative persona

Maya is already using Kwilt to keep family life moving. Her household maintains a shared list of chores from which family members choose their own contributions. During summer, a child must complete at least two chores on each day they want screen time. During the school year, the agreement changes: at least twelve chores must be completed before screen time becomes available on Friday night or Saturday.

- Current situation: recurring household work lives in memory, conversation, or an adult's personal to-do list.
- What she's trying to become/do: help the family share responsibility through an understandable daily rhythm.
- Emotional state or tension: she wants less nagging and mental load, but does not want to become the household project manager.
- What would make this feel wrong to her: surveillance, public comparison, chore currency, shame, or a configurable dashboard that creates more administration than it removes.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — household routines matter when they turn ordinary intentions into dependable follow-through.

## Job flow step

`job-flow-maya-move-family-life-forward`:

- **Schedule or hand off — 2/5:** scheduling and sharing foundations exist, but ordinary household handoff is not cohesive.
- **Family participation — 3/5:** Household, Goal support, Games, and shared receiving projections now have explicit contracts, but ordinary household responsibility remains early.
- **Keep using the system — 3/5:** any Chores direction must reduce upkeep rather than introduce a family-management hobby.

The older `chores-as-recurring-activities` brief describes Family participation as 2/5. The current job flow has since moved it to 3/5 for other shipped or contracted participation foundations; Chores should target the remaining responsibility gap rather than claim that broader progress as its own.

## Active anchors

- `jtbd-carry-intentions-into-action` — a recurring responsibility must survive time, repetition, and handoff without Maya carrying every step herself.
- `jtbd-invite-the-right-people-in` — a family member should receive only the responsibility and context they need, not blanket access to another person's Activities.
- `jtbd-trust-this-app-with-my-life` — completion, recurrence, visibility, and responsibility must remain calm, legible, and truthful to adults and children.

## Friction we're addressing

The household's chore system is a shared opportunity pool, not an assignment list. A family member chooses useful work, completion is attributed to that person, and an agreement evaluates qualifying completions over different seasonal windows. Existing To-dos do not naturally represent availability, claiming, member-attributed completion counts, or a rule that changes between summer and the school year.

## System alignment

Constraint posture: `Question the system`

The exploration concludes that **Chores** should become a standalone capability with its own narrow domain model. Activities may receive links or projections later, but they should not own chore truth.

Current system facts:

- Existing surface: To-dos owns Activity creation, detail, recurrence, scheduling, and completion. Household settings owns family membership, dependent setup, and capability activation. A prior Option G navigation prototype included a direct **Chores** destination, while the existing Chores brief recommended no global capability in its first release.
- Existing user flow: an adult can create repeating Activities and establish a Household, but there is no source-backed shared chore pool where a household member chooses available work and receives attributed completion credit.
- Existing domain/data model: Activities already carry repeat rules and scheduling fields, but those primitives do not model a shared opportunity pool or count-based eligibility windows cleanly. Household already distinguishes owner, caregiver, and child roles plus capability-scoped grants. No implemented Chore object was found.
- Existing technical affordances: Household membership and child activation are implemented capability foundations. Family Screen Time can describe a responsibility criterion, but its contract deliberately treats Activities as the source and can remain valuable without Chores.
- Existing UX/copy conventions: reveal family participation only after relevant household activity exists; prefer named-member and “For others” projections over global monitoring; keep a child's explanation concrete and blame-free; avoid productivity jargon, streaks, rankings, overdue shame, and default-public sharing.

Constraints to preserve:

- A child must never need to understand the Activity model, adult To-dos organization, or its configuration vocabulary to use Chores.
- Chores are chosen from a shared pool by default; assignment may exist later for exceptional cases but is not the organizing model.
- Completion must preserve who did the chore, when it qualified, and which eligibility window consumed that fact.
- Solo users and households that never activate Chores should receive no permanent Chores chrome.
- Chores must be independently useful, while Screen Time may evaluate chore-completion thresholds as one explicit family agreement.
- A threshold such as “2 today” or “12 before the weekend” is not a currency wallet: chores do not convert into minute balances, prices, points, or spendable rewards.
- Caregiver visibility should support coordination, not detailed surveillance.

Constraints we may challenge:

- The previous assumption that Chores should never be a first-class capability destination.
- The assumption that adult To-dos is the right primary presentation for a child or for a family-wide daily rhythm.
- The prior assumption that Activities should remain canonical for chores.
- The label **Chores** itself: it may be immediately legible, but a broader concept such as **Responsibilities** may better support growing independence and non-punitive household participation.

Design implication:

The Chores capability needs a small purpose-built model: a household chore catalog, current availability, member-attributed completion events, and readable progress facts. Screen Time owns the seasonal access agreement and enforcement; Chores owns the qualifying work and completion truth. The interface should foreground choice and contribution rather than assignment and task administration.

## Aspirational design challenge

How might we help each child choose and complete a fair share of useful household work, while letting the family's seasonal Screen Time agreement respond predictably without turning chores into points, currency, or surveillance?

## Out of scope

- Allowance, money, points, rewards, penalties, rankings, or streaks.
- Per-chore minute conversion, an earned-time wallet, or spendable chore currency.
- Photo or AI proof of completion.
- A household performance dashboard or detailed child surveillance.
- A generic project-management system for the family.
- Implementation decisions before the capability shape is chosen.

## Open question

When a child marks a chore complete, should it count toward Screen Time immediately, or only after lightweight caregiver confirmation?
