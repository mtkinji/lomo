# UI Contract: Kwilt 2.0 Games maturity

Job: When a small opening appears, Maya needs to choose and start a shared game quickly, so the group begins before the moment disappears.

Primary action: Start Oddball with tonight's players.

Must show: the Games identity, join action, one featured recommendation, release catalog, expected duration/energy, player range, utilities, and development-only Workshop boundary.

Oddball play contract: 3–8 players use the canonical saved-player setup because the public board must attach points and the Oddball marker to names. During each of six questions, the shared/cast board shows one problem, three numbered answers, a 15-second clock, quiet background music, and the compact score rail. When time ends, music yields to a visible and spoken 3–2–1 countdown. Result entry asks for the single largest group, starts with nobody selected, and lets the host directly select the players in that group. If exactly one player is outside it, that player is the sole unique player; with multiple outsiders, the host may identify the one sole unique answer or record none. Ties score nothing. The result celebrates the authored consequence and any marker transfer before the next question. After six questions, the highest unmarked score wins; tied eligible leaders share the win.

Oddball teaching contract: “Pick what most people will pick. Match the biggest group to score. Stand alone and you get the Oddball. Six questions. You can’t win while you have it.” Keep the same concise rules available from one 44-point help affordance throughout play. Do not add a carousel, practice mode, persistent helper paragraphs, or per-game settings.

Reveal later: player naming, remembered-player editing, rules, remote-table details, and playtest promotion criteria.

Clue Circle play contract: one spare handoff state names the finder, says “Phone on forehead” and “Tilt down to start,” then confirms the practice tilt with a positive haptic and sound; during play, tilt down repeats that positive confirmation for Correct, while tilt up uses a distinct medium confirmation haptic and audible wobble for Pass; a compact Start fallback appears only without motion; active play uses the phone canvas itself with only a centered target and nearby timer; there are no active-round buttons because the phone is out of reach; turn results create the handoff boundary.

Clue Circle sound contract: one icon in the persistent game top bar reflects sound on/off and changes it for the current table. The saved Games sound preference remains the starting state for the next table. Do not add sound copy, a modal, or controls inside the clue canvas.

Must not add: onboarding, a quality dashboard, streaks, public rankings, per-game settings, a duplicate Oddball card, remote Oddball voting, or production Workshop exposure.

Reuse map:
- capability navigation → `PageHeader`
- tactile actions → `Pressable` and existing `GameButton` downstream
- Games identity → `GameBackdrop`, `gamesTheme`, existing marks and cards
- local launch → `GamePlayerSetup`

Behavior sources:
- fast guest play → `jtbd-help-us-enjoy-being-together` and the accepted brief
- Oddball points and marker → the user-approved, simulation-tested majority/sole-unique rules
- Oddball result entry → local/cast shared-screen topology and the canonical player model
- production curation → accepted brief and user-set high quality bar
- Workshop visibility → existing Slanguage learning-release pattern
- optional local names → existing neutral-name launch behavior; remote host naming remains explicit

Unresolved decisions: which human playtest groups provide the final promotion evidence.

Required states: production shelf without Workshop; development shelf with Workshop; blank local seats; named/saved local seats; unnamed remote host; scroll through utilities; featured-game navigation.

Oddball required states: terse teach; timed choice; reveal; largest-group selection; scoring-player correction; optional sole-unique selection; tied round; marker transfer; marked leader blocked from winning; single eligible winner; replay.

Clue Circle required states: first handoff, active timed target, correct advance, pass advance, turn result, next-finder handoff, circle result, and replay.

Clue Circle active-round hierarchy:
- The target occupies the center of the screen at a distance-readable size and may wrap to two lines.
- The gesture mapping appears during handoff only; duration, motion status, explanation, and clue-style copy are removed.
- The clock is the only HUD element during play. Finder and score return at the turn boundary.
- Active play contains no touch controls. Motion availability is resolved at handoff, before the timed round begins.

Proof path: current branch → Kwilt app → Fun → Games on the current iPhone Simulator/runtime; open Oddball from the featured recommendation, seat three players, complete unanimous, split, tie, marker-transfer, and winning rounds, then replay and inspect the Workshop development state.

## Reduction pass

- Oddball appears once as the dominant featured action, not again in the grid.
- Duration and energy share one compact metadata line; no filters or settings are added.
- Workshop explanation is one sentence and only appears when Workshop tables exist.
- “Names are optional” is retained because it explains why blank fields and an enabled action are intentional.
- Existing Utilities remain subordinate and unchanged.
