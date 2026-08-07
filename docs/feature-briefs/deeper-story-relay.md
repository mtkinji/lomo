---
id: brief-deeper-story-relay
title: Shared Story Worlds
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-help-us-enjoy-being-together
job_flow: job-flow-maya-start-playing-together
serves: [jtbd-help-us-enjoy-being-together, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-kwilt-2-games-maturity]
owner: andrew
last_updated: 2026-08-05
---

# Shared Story Worlds

## Context

Story Relay asks each person to write a sentence but provides no shared objective, tactical stakes, responsive world, or earned ending. The family supplies nearly all momentum. This release tests whether a deterministic cooperative game plus bounded AI callbacks can create a story the room feels it authored together.

## Target audience

Aspirational family organizers want a small evening opening to become memorable shared play without preparation, account requirements, or one adult acting as game master.

## Representative persona

Maya is casting Kwilt to the living-room TV with adults and younger children nearby. She wants the group talking to one another quickly and needs the game to survive weak internet, mixed reading ability, and uneven device ownership.

## Aspirational design challenge

How might we help Maya's family enter a surprising shared adventure where every person changes what happens, while preserving the effortless start, shared-screen energy, and human authorship of a couch game?

## Hero JTBD

`jtbd-help-us-enjoy-being-together` — the adventure succeeds when the family remembers what it decided and did together, not how much content AI produced.

## Job flow step

Improve `job-flow-maya-start-playing-together` step 7, **Play through a fair, responsive shared game**, currently provisionally 3/5 for Story Relay, while learning toward step 9, **Preserve continuity only after it earns the interruption**, currently 1/5.

## JTBD framing

When the room is ready to imagine together, give every person a clear way to change a shared story, make the danger and trade-offs understandable, and reach an ending worth retelling. Keep local participation complete without accounts, personal phones, or a network connection.

## Design

### Game contract

- Three scenes: Find a Way, Hold Together, and Finale.
- One visible Goal, Promise, and Trouble track.
- Every scene has a rotating spotlight player and three plain commitments.
- Players choose physically and reveal together; the host records each seat's response.
- Choice coverage determines a transparent local cost: three approaches add no Trouble, two add one, one adds two.
- Each character has one Power that covers a missing approach and one Keepsake that may absorb one Trouble.
- The deterministic engine owns state, cost, and bright/costly/heroic outcomes.

### AI contract

- AI may generate bounded story framing, a midpoint twist, and an ending telling.
- AI may not invent commitments, score creativity, change Trouble, spend resources, or overrule an outcome.
- Requests go through Kwilt's proxy, use structured JSON, and expire after three seconds in play.
- Bundled content is created at the same time and remains the authoritative fallback.
- Only fictional choices and structured state are sent; the app does not continuously listen or inspect unrelated Kwilt data.

### First-release presentation

- Reuse Story Relay's shelf entry, canonical player setup, game frame, music, restart, and sound preference.
- Show only the Goal, Promise, Trouble, current scene, current choice, and available resource at the moment each is actionable.
- Use semantic haptics and the existing Games effects library for reveal, cost, resource, and ending beats.
- End with a concise outcome, two concrete callbacks, and **New adventure**.

### Participation boundary

The learning release is local/cast-first for 2–6 seats on one phone. Joined controllers, remote synchronization, pet participation, editable character sheets, and durable campaigns are excluded until the core table loop proves fun.

## Acceptance criteria

- The previous sentence-composition loop is replaced on the existing Story Relay route.
- Story mechanics are pure, deterministic, and unit tested across coverage, Power, Keepsake, Trouble, and final outcomes.
- Bundled content produces a complete three-scene adventure for every supported flavor and player count.
- AI prompt builders and response validation are tested; invalid, slow, unavailable, or unsafe output falls back without blocking.
- Every local player records one commitment in every scene.
- The first scene teaches physical reveal and host recording without a separate tutorial screen.
- Sound can be toggled from the game header; meaningful haptics remain available independently.
- The UI remains legible in portrait and landscape/cast presentation.
- No durable player, Pet, or story data is written.
- `npm run verify:changed -- --run` passes.
- Simulator review and signed-device family play remain required proof gates for layout, pacing, sound, haptics, AI latency, and fun.

## Spec refinement

The first slice intentionally uses three total scenes rather than giving every player a separate spotlight in every act. Every seat still makes a consequential commitment in all three scenes; spotlight speech rotates and the finale invites the whole group. This keeps a 2–6 player session inside the 15–25 minute target.

Character suggestions are not editable in this release. Powers have different story labels but share one transparent mechanical effect: cover one missing approach. Keepsakes share one effect: absorb one Trouble. This preserves understandable timing decisions without pretending the first build has a balanced class system.

AI will not receive ambient speech. The responsive callback is grounded in recorded commitments, resource use, flavor, and local character details. This is enough to test whether live response creates value without adding transcription, privacy, and latency risk.

Host choice recording is the primary unresolved interaction risk and must be observed at a real table before optional phone controllers are built.

## Success signal

A mixed-age group completes without explanation, can say why Trouble changed, voluntarily discusses a resource, and immediately requests another adventure or retells a choice-grounded callback.

## Open questions

- Does sequential host recording preserve the energy of simultaneous reveal for four to six players?
- Is one shared three-second reveal countdown enough, or should later scenes shorten automatically?
- Do the existing soundtrack and effects support the intended storybook tone well enough for the learning release?
