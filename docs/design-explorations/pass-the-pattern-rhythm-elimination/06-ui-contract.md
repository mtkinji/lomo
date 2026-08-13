# UI contract: Pass the Pattern rhythm elimination

Job: When a group starts Pass the Pattern, build and remember a song together until one player remains.

Authority chain: observed table feedback -> accepted feature brief -> Games player setup and Connection Game frame -> local Games theme and components -> native Pressable/audio/accessibility behavior.

Three-second read: whose turn it is, which groove is playing, and whether to watch or tap.

Primary action: advance the current handoff, watch, elimination, or finish state.

Primary information: active player, visible four-count pulse, pattern progress, and remaining players.

Secondary information: groove name and tempo; eliminated-player list after a miss.

Reveal later: eliminated players and next groove appear only at a round boundary.

Scan order: active player/instruction -> pulse/pattern -> beat pad or one continuation action.

Must not add: score, accuracy percentage, difficulty selector, genre settings, song editor, saved music, remote status, or extra failure action.

Reuse map: player setup -> `GamePlayerSetup`; shell/sound/restart -> `ConnectionGameFrame`; state boundary -> `PlayCard`; dominant action -> `GameButton`; musical input -> existing tokenized beat pad.

Nearest precedent: current Pass the Pattern route. Preserve its handoff/watch/repeat/add rhythm while replacing restart-on-miss with survivor rounds.

External exemplar ledger: N/A.

Behavior sources: progressive elimination, touch-down sound, equal note duration, beat judgment, genre changes, and musical combination are explicit user decisions from observed play.

Unresolved decisions: exact physical-device timing window and final groove mix remain learning gates, not user-facing settings.

Required states: initial handoff, watching, replay-ready, repeat, add, wrong note, off-beat miss, next round, one winner, sound off, restart, reduced motion, compact phone, and large text.

Proof path: Kwilt -> Play -> Pass the Pattern -> seat 2-6 players -> complete turns -> eliminate players -> finish. Verify direct touch-down sound, VoiceOver labels, visible pulse with sound off, restart, and all four groove rounds.
