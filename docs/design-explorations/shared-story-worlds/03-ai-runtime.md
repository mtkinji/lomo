# AI Runtime: Alive When Connected, Complete When Offline

## Decision

The game is **AI-enhanced but not AI-dependent**.

AI should make each adventure feel responsive, personal, and surprising. It should not own the rules, decide whether an action was good, or determine whether the family can play. The complete mechanical game—including a coherent story—must continue without an internet connection.

There is no pre-game mode choice. When generation is available, the game uses it. When it is slow or unavailable, an authored local path continues invisibly.

## Why AI belongs here

AI adds value when it proves the world was listening:

- A strange character trait changes how an NPC responds.
- A discarded object returns as a later complication.
- The group's Promise appears in the final cost.
- A child's unexpected solution becomes part of the world instead of being ignored by a fixed prompt.
- The recap names the particular choices that made this adventure theirs.

More generated prose does not make the game more interesting. The interesting effect is **specific consequence and callback**.

## Three-layer architecture

### 1. Deterministic local game engine

Code owns:

- Turn order and spotlight rotation.
- Available commitments.
- Trouble and set-piece state.
- Power, Keepsake, and pet-rescue use.
- Combination rules, costs, and victory outcome.
- Timers, reconnect behavior, and idempotent commands.

The same state and choices always produce the same mechanical result. AI cannot award success for eloquence, change probabilities, invent a new rule, or overrule a resolved command.

### 2. Bounded AI story director

When connected, AI returns validated structured data for:

- The one-sentence Goal and Promise options.
- Suggested character names, traits, Powers, and Keepsakes drawn from approved mechanical types.
- Brief scene framing inside an authored set-piece template.
- Fictional consequences that express the result already calculated by code.
- One midpoint callback and one ending recap grounded in actual play.

Every response is schema-validated, length-bounded, age-appropriate, and replaceable by a local equivalent. Invalid output is treated exactly like no output.

### 3. Authored local adventure pack

The app bundles enough objectives, characters, set-piece frames, transitions, complications, and endings to produce several complete adventures without generation. Local templates accept player names, chosen traits, resources, and resolved outcomes so the fallback still acknowledges the group rather than reading like an error message.

Completed generated adventure plans may be cached for later replay, but the game does not require an existing cache to work offline.

## Generation cadence

Do not make a network request after every player action.

1. **During setup:** generate the adventure skeleton while players choose or accept characters. The local engine prepares a fallback skeleton at the same time.
2. **After the first act:** request one bounded twist using the group's actual choices. The reveal, sound, and scene transition naturally cover a short response window.
3. **At the ending:** calculate the outcome locally first, then request a brief personalized telling and recap.

Normal turn-to-turn consequences come from authored templates filled with current story details. This keeps people playing rather than waiting for narration.

No AI request gets an indefinite loading screen. If the response misses a short scene-transition deadline, the local version appears and the late response is discarded. The exact deadline should be tuned in physical couch testing; three seconds is the initial ceiling for an in-play transition.

## Connection behavior

| Situation | Player experience |
| --- | --- |
| Connected at start | Generated objective, characters, callbacks, and recap appear within the authored game structure |
| Offline at start | A bundled adventure begins normally; a small offline notice may appear only if it helps explain reduced variation |
| Connection drops mid-game | Current state and timers continue locally; subsequent narration uses authored templates |
| AI request is slow | The local consequence wins the deadline; no spinner blocks the turn |
| AI output is invalid or unsafe | The response is discarded and the local equivalent is used |
| Connection returns | Generation may resume at the next unresolved story boundary; it never rewrites prior events |

For remote play, internet is inherently required to synchronize remote seats. That is a multiplayer transport requirement, not an AI requirement. Local couch play remains available without either service.

## Data and family-safety boundary

The model receives only what it needs for the current fictional scene:

- Selected story flavor and age band.
- Fictional character details the players chose to use.
- Structured game state and resolved mechanical outcome.
- A short, explicit player-submitted action summary when needed for a callback.

The game does not continuously listen to the room, infer family relationships, inspect unrelated Kwilt data, or send raw family conversation by default. Generated dialogue is not stored for analytics. A concise first-use disclosure should explain that fictional choices are sent to Kwilt's AI service to shape the adventure.

## Product presentation

Do not add **AI mode**, a model picker, generation controls, or an AI narrator persona. Players should experience a responsive story, not operate an AI tool.

The only exceptional state worth naming is a persistent offline state, and even then the useful message is plain:

> Playing an included adventure. Your game will still work.

## First learning-release contract

The first release should include both paths because they answer different questions:

- The connected path tests whether callbacks and responsive consequences materially increase delight and rematch intent.
- The local path tests whether the actual game remains comprehensible and fun once the novelty of generation is removed.

During family testing, compare whether players retell AI-created callbacks more often than authored ones, whether anyone notices or resents generation pauses, and whether an offline session still produces an immediate request to play again.

## Stated bet

We're betting that **two or three well-timed, choice-grounded AI callbacks will make an authored cooperative game feel uniquely alive without slowing its table rhythm**.

If players value the generated prose but do not change decisions, retell callbacks, or request rematches, AI should move upstream into content authoring rather than remain a live runtime dependency.
