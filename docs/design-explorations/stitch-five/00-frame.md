# Frame: Stitch Five

## What the user said

> Stitch Five is basically a reskin of Yahtzee: five dice, up to three rolls, pin what you keep, and commit one combination each stitch. It should feel like a small, satisfying quilt-making ritual rather than a casino game pasted into a family app. Change the familiar play only where testing shows a genuine improvement.

## Restated in user voice

When a few of us have an unstructured pocket of time, we want a familiar dice game we can begin immediately and shape together, so the finished play feels like something we made rather than another score we accumulated.

## Target audience

`audience-aspirational-family-organizers` — people who want family connection to begin without accounts, administration, or rules-heavy setup.

## Representative persona

Maya wants to turn a small opening in family life into something people willingly do together.

- Current situation: Two or more people have 10–20 unstructured minutes and a phone nearby.
- What she is trying to do: Start a satisfying shared game before setup or indecision consumes the moment.
- Emotional state or tension: She wants play to feel warm and easy, not like another system to manage.
- What would make this feel wrong: Mandatory accounts, a long tutorial, casino energy, public rankings, streak pressure, or a quilt theme that does not affect play.

## Hero anchor

`jtbd-help-us-enjoy-being-together` — connection is the job; the dice and quilt are the reason to gather.

## Job flow step

Stitch Five most directly serves steps 4, 6, 7, and 8 of `job-flow-maya-start-playing-together`: choose a game everyone agrees on, understand the next action, complete a fair responsive game, and celebrate the result. Kwilt already delivers these steps at scores 3–4; the gap is not access to another game, but a calmer strategic game whose ending leaves a distinctive shared artifact.

## Active anchors

- `jtbd-help-us-enjoy-being-together` — Stitch Five should create easy table time and light conversation.

## Friction we're addressing

Kwilt's current ready catalog leans toward lively press-your-luck and social connection games. It does not yet offer a quieter, tactile-feeling strategy game in which players steadily construct something visible. Stitch Five can fill that gap without claiming a novel ruleset: its product value can come from making familiar play clearer, warmer, faster, and more satisfying to finish.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: Games lives under Play and presents a guest-first shelf of ready and workshop titles.
- Existing user flow: A game advertises player count, duration, energy, and promise, then moves directly into local setup and play.
- Existing domain/data model: The catalog distinguishes tumble games from connection games; Bank and Farkle already provide dice, local seating, player continuity, celebrations, and private-table foundations.
- Existing technical affordances: Kwilt has dice interaction, game setup, saved players, sound settings, personal-best storage, and remote room infrastructure.
- Existing UX/copy conventions: Immediate next actions, warm physical metaphors, low setup, private play, honest release status, and no productivity framing.

Constraints to preserve:

- Guest-first play with no account requirement.
- Two or more players as the primary product promise.
- A first meaningful action within seconds.
- No public leaderboard, streak pressure, or family-administration dependency.
- The quilt board must remain readable and operable without relying on color alone.

Constraints we may challenge:

- The current `tumble` route assumes Bank, Farkle, or a utility; Stitch Five deserves its own board state and presentation even while preserving the familiar rules.
- A private solo practice mode could be considered later, but a solo daily challenge would be a separate product bet because the current Games JTBD explicitly rejects first-party single-player games.

Design implication:

Keep the familiar five-dice, three-roll rules so the game is instantly legible. The quilt board should make category availability, score previews, committed scores, bonuses, and progress easier to understand while turning the completed scorecard into a satisfying artifact. Spatial placement, adjacency, color-family, or symmetry rules are optional experiments, not launch requirements; they ship only if comparative playtesting shows that they improve decisions without slowing turns or increasing teaching.

## Aspirational design challenge

How might we help Maya's group turn a short opening into a calm strategy game that produces a quilt they visibly made together, while preserving guest-first play and an immediate next action?

## Out of scope

- `Today's Pattern`, streaks, notifications, or a solo retention loop.
- Public sharing or leaderboards.
- Remote multiplayer in the first learning release.
- AI-generated patterns or commentary.
- New scoring or placement rules that have not beaten the familiar rules in comparative playtesting.

## Open question

Should Stitch Five be shared-first to fit Kwilt's current Games job, or are we intentionally opening a new solo-ritual job for Games?
