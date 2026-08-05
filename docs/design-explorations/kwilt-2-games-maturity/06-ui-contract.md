# UI Contract: Kwilt 2.0 Games maturity

Job: When a small opening appears, Maya needs to choose and start a shared game quickly, so the group begins before the moment disappears.

Primary action: Play Show of Hands now.

Must show: the Games identity, join action, one instant recommendation, release catalog, expected duration/energy, player range, utilities, and development-only Workshop boundary.

Reveal later: player naming, remembered-player editing, rules, remote-table details, and playtest promotion criteria.

Clue Circle play contract: one spare handoff state names the finder, says “Phone on forehead” and “Tilt down to start,” then confirms the practice tilt with sound; tilt up maps to Pass; a compact Start fallback appears only without motion; active play uses the phone canvas itself with only a centered target and nearby timer; there are no active-round buttons because the phone is out of reach; turn results create the handoff boundary.

Clue Circle sound contract: one icon in the persistent game top bar reflects sound on/off and changes it for the current table. The saved Games sound preference remains the starting state for the next table. Do not add sound copy, a modal, or controls inside the clue canvas.

Must not add: onboarding, a quality dashboard, streaks, public rankings, per-game settings, duplicate Show of Hands card, or production Workshop exposure.

Reuse map:
- capability navigation → `PageHeader`
- tactile actions → `Pressable` and existing `GameButton` downstream
- Games identity → `GameBackdrop`, `gamesTheme`, existing marks and cards
- local launch → `GamePlayerSetup`

Behavior sources:
- instant guest play → `jtbd-help-us-enjoy-being-together` and the accepted brief
- production curation → accepted brief and user-set high quality bar
- Workshop visibility → existing Slanguage learning-release pattern
- optional local names → existing neutral-name launch behavior; remote host naming remains explicit

Unresolved decisions: which human playtest groups provide the final promotion evidence.

Required states: production shelf without Workshop; development shelf with Workshop; blank local seats; named/saved local seats; unnamed remote host; scroll through utilities; quick-start navigation.

Clue Circle required states: first handoff, active timed target, correct advance, pass advance, turn result, next-finder handoff, circle result, and replay.

Clue Circle active-round hierarchy:
- The target occupies the center of the screen at a distance-readable size and may wrap to two lines.
- The gesture mapping appears during handoff only; duration, motion status, explanation, and clue-style copy are removed.
- The clock is the only HUD element during play. Finder and score return at the turn boundary.
- Active play contains no touch controls. Motion availability is resolved at handoff, before the timed round begins.

Proof path: current branch → Kwilt app → Fun → Games on the current iPhone Simulator/runtime; open the shelf, use Play now, return, open a setup-based game, start with blank seats, and inspect the Workshop development state.

## Reduction pass

- Show of Hands appears once as the dominant quick-start action, not again in the grid.
- Duration and energy share one compact metadata line; no filters or settings are added.
- Workshop explanation is one sentence and only appears when Workshop tables exist.
- “Names are optional” is retained because it explains why blank fields and an enabled action are intentional.
- Existing Utilities remain subordinate and unchanged.
