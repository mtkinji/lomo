# UI contract: Game Timer

Job: When a game calls for one minute, replace the missing timer immediately so the group keeps playing.

Primary action: Choose a visible preset or adjust by 15 seconds, then press Start.

Must show: selected time in `m:ss`, common presets, decrease/increase controls, one Start action, exact remaining time, an unlabeled progress ring, unmistakable completion, back navigation, optional music state, and reset while running.

Reveal later: urgency color only during the last ten seconds; reset only while active.

Must not add: hourglass or sand imagery, a numbered perimeter scale, view modes, pause, player setup, scoring, history, remote state, onboarding, or notification permission.

Reuse map: Games shelf utility pattern; Games native stack; `gamesTheme`; absolute-deadline timer hook; semantic haptics; Games music and completion feedback; SVG only for the progress ring.

Behavior sources: easy duration choice, removing the wind-up setting burden, removing the misleading numbered face, and optional music are explicit user decisions. Trustworthy time and background reconciliation serve `jtbd-trust-this-app-with-my-life`. Guest-first, no-setup launch follows the existing Games utility contract.

Required states: default ready, preset selected, minimum/maximum adjustment, running, final ten seconds, finished, reset, music off/on, route unfocused, background/resume, audio unavailable, haptics unavailable, and compact phone viewport.

Proof path: Kwilt → Play → Games → Utilities → Game Timer. In Simulator, prove every preset, 15-second adjustment, start, visible countdown, reset, finish, repeat, music, back, and background/resume. On a signed iPhone, prove tap targets, tick balance, and completion haptic/audio.
