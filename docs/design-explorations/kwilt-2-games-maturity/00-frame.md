# Frame: Kwilt 2.0 Games maturity

## What the user said
> Mature the existing feature set for Kwilt 2.0. Not all games are mature enough; set a high bar for fun and engagement and mature them.

## Restated in user voice
When a small opening appears, Maya wants to start something the room will willingly keep playing, so the moment becomes time together instead of setup, indecision, or a thin prompt exercise.

## Target audience
`audience-aspirational-family-organizers` — families who want an easy shared moment without another system to administer.

## Representative persona
Maya is trying to turn ten unstructured minutes into something her family chooses together. She will initiate, but she does not want to explain an app, create accounts, or referee unclear rules.

## Hero anchor
`jtbd-help-us-enjoy-being-together` — connection is the purpose of Games, not a reward for completing work.

## Job flow step
`job-flow-maya-start-playing-together`, especially steps 3–8: see honest choices, choose quickly, seat players, know the next action, complete a responsive game, and replay. The documented flow predates integration and still scores these steps at 1, so this pass treats the scores as stale and uses current source as evidence without updating them before runtime/playtest proof.

## Active anchors
- `jtbd-help-us-enjoy-being-together` — the game must create a shared moment, not merely display a prompt.
- `jtbd-trust-this-app-with-my-life` — the release catalog must be honest about what has cleared the bar.

## Friction we're addressing
The shelf gives ten games equal billing even though their loops have unequal maturity. Most local games also disable Start until every default seat is named, even though their launch code already supports neutral Player 1 / Player 2 identities. Clue Circle has the physical promise of rapid group guessing, but its fixed three-target turns, changing instructions, and separate on-screen skip action interrupt that promise.

## System alignment
Constraint posture: `Fit the system`

Current system facts:
- Existing surface: one Games shelf plus Games-owned setup and play screens.
- Existing user flow: shelf → optional player setup → local game → finish/replay.
- Existing domain model: a typed catalog routes into deterministic game domains and local screens; Slanguage already demonstrates an environment-gated learning release.
- Existing technical affordances: saved players, neutral fallback names, audio/haptics, orientation, remote tables, and focused Jest coverage.
- Existing UX convention: guest-first, table-native, warm, direct, and free of household administration.

Constraints to preserve:
- No mandatory account or durable household setup.
- No public leaderboard, streak, engagement pressure, or first-party solo game.
- Do not describe source completeness as proof that a game is fun.

Design implication:
Use catalog curation as a release control, remove unnecessary naming friction, and require human table evidence before promoting weaker loops. Do not add a dashboard or a second Games destination.

## Aspirational design challenge
How might we help Maya choose and begin a game the room wants to replay, while preserving instant guest play and being honest about which tables have earned 2.0 billing?

## Out of scope
Entirely new game concepts, remote-protocol expansion, accounts, monetization, public social features, and claiming human fun validation from automated tests. Maturing a promising existing loop, including Clue Circle, is in scope.

## Open question
Which playtest group and number of sessions should be the final human gate for promoting Workshop games?
