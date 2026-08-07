# Learning Release: Shared Story Worlds

## Concept To Build

Replace Story Relay's sentence-passing loop with a three-scene cooperative adventure where every player makes an independent choice, the group manages rising Trouble and scarce character resources, and AI turns resolved choices into a responsive family story without owning the rules.

## Capability Delta

Today, the user cannot:

- Pursue a shared objective or win and lose together in Story Relay.
- Make tactical choices that affect a visible danger.
- Use a character-shaped resource to help the group.
- See the story respond to earlier group choices.
- Continue a local Story Relay session when live generation is unavailable because live generation does not exist.

After this release, the user can:

- Choose a story flavor and begin a coherent adventure without writing prose.
- Play through Find a Way, Hold Together, and Finale scenes.
- Reveal one of three commitments physically, then record each player's choice on the host phone.
- Spend a once-per-adventure Power or sacrifice a Keepsake to control Trouble.
- Reach a bright victory, costly victory, or heroic failure determined by transparent local rules.
- Receive bounded generated framing, a midpoint callback, and an ending when AI is available while retaining a complete bundled adventure offline.

Still intentionally not supported:

- Joined-phone controllers or remote Story Relay rooms.
- Durable characters, campaigns, leveling, inventories, or story history.
- Pet companions.
- Speech recognition, continuous listening, maps, avatars, or generated audio.
- AI judging creativity, changing mechanics, or blocking a turn.

## User Experience

Story Relay remains in its existing Games shelf position and uses the canonical player setup. After launch, the group chooses one of three story flavors and sees its Goal, Promise, and simple character identities. The game teaches through the first scene rather than through a separate rules page.

Each scene names a spotlight player and presents three numbered, icon-supported commitments. Players discuss, choose with their fingers, and reveal together after a short countdown. The host records each seat's choice. The deterministic engine resolves coverage, applies any Power, advances Trouble, and offers a Keepsake sacrifice when it can absorb a cost. A brief consequence leads directly into the next scene.

The ending shows what the group achieved, what it protected, and concrete callbacks to its choices. **New adventure** restarts with a different bundled seed while preserving the selected player roster.

AI generation begins in the background from the flavor screen. Local content is visible immediately and always wins a scene deadline. The screen never waits on a generation spinner.

## Existing Product Relationship

This replaces `StoryRelayGame` rather than adding another shelf entry. It retains the existing route, player setup, restart affordance, soundtrack, sound preference, shared-screen presentation, and local session boundary.

## Buildable Slice

Must be real:

- A tested deterministic story-adventure domain with three scene families, Trouble, character Powers, Keepsakes, and final outcomes.
- Three bundled adventure skins with family-safe goals, promises, scenes, callbacks, and endings.
- A tested AI prompt/parser contract whose output may change fiction but not mechanics.
- A three-second best-effort proxy transport with schema validation and fallback.
- A complete local/cast-first React Native flow for 2–6 players.
- Immediate semantic haptics and existing game audio cues for reveal, Trouble, resource use, and endings.
- The existing table sound toggle during Story Relay play.

Can be thin or temporary:

- Character names, traits, Powers, and Keepsakes are deterministic suggestions rather than editable sheets.
- Host choice recording is sequential after the physical reveal.
- AI generates text only; soundtrack and effects use the existing Games library.
- Session state is local and ephemeral.

Intentionally excluded:

- Seat claiming, QR joining, server authority, reconnection, or remote parity.
- Pet integration and durable player-profile expansion.
- Custom Core Haptics patterns or a new story soundtrack asset pack.
- Analytics beyond existing screen/session evidence.

## Release Channel

`TestFlight build` after local source tests and Simulator review. This is a real bundled replacement for Andrew's family dogfooding, but it is not ready for production promotion until at least two complete couch sessions establish comprehension, pacing, emotional safety, and voluntary replay.

## Brand-Goodwill Guardrails

- The game is complete offline and does not expose generation errors.
- AI receives fictional game inputs only and is disclosed once in plain language.
- Failure is heroic and story-bounded; players are never ranked, eliminated, profiled, or blamed.
- The pet and durable profile remain untouched.
- Generated copy is short, mixed-age safe, and schema bounded.

## Reversibility

The implementation remains behind the existing Story Relay route and uses only ephemeral state. Reverting `StoryRelayGame` and its new domain/AI modules restores the prior loop without data migration or cleanup.

## Permanent Product Threshold

At least two mixed-age groups complete without explanation, every seat contributes choices, one group voluntarily spends a resource, generation never visibly stalls play, and at least one group immediately requests another adventure or retells a choice-grounded callback.
