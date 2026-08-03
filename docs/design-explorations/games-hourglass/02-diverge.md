# Diverge: Games Hourglass

Axis of variation: literal table object vs configurable utility vs embedded game control.

## A. Flip The Glass

A full-screen, fixed 60-second hourglass. The resting object invites one action: **Flip hourglass**. Sand, time, optional music, and the completion cue all belong to the same moment.

- Persona fit: strongest; Maya gets the missing piece without making choices.
- System fit: adds one Games utility route and reuses Games audio, haptics, theme, and navigation.
- Best when: the game explicitly calls for a one-minute sand timer.
- Fails when: the group needs arbitrary durations.
- Anti-pattern check: passes; no setup, productivity framing, streaks, or administration.

## B. Pocket Timer Kit

A duration picker with common board-game presets followed by a countdown surface.

- Persona fit: broader but slower at the moment of need.
- System fit: still a utility, but adds configuration state and more visible controls.
- Best when: many different physical games rely on different timers.
- Fails when: choosing a duration feels like setup.
- Anti-pattern check: technically passes, but risks generic timer-app chrome.

## C. Table Turn Overlay

A timer that can be opened over any Kwilt game and attached to player turns.

- Persona fit: useful only inside Kwilt-owned games, not the physical game Maya is playing now.
- System fit: bends navigation and game-state ownership and creates cross-game coupling.
- Best when: individual Kwilt games require timed turns.
- Fails when: the timer is needed for an external tabletop game.
- Anti-pattern check: risks administration and unnecessary player tracking.

All alternatives leave Arcs, Goals, Activities, and Chapters untouched. None blocks capture or adds an identity score.
