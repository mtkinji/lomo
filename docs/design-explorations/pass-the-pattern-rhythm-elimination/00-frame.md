# Frame: Pass the Pattern rhythm elimination

## What the user said

After a family table-play round, Andrew asked for play to continue after a miss with only that player out, immediate and uniformly timed note sounds, and genre beats that make the shared pattern feel like music.

## Restated in user voice

When we have a few minutes together, we want a responsive game where each tap helps build a song and a miss narrows the circle instead of ending everybody's fun.

## Target audience

`audience-aspirational-family-organizers` — families who want to begin playing before setup drains the moment.

## Representative persona

Maya is gathering family members around one phone for a short, lively game. She wants the rules to become obvious through play and the device to respond as quickly as the table does.

## Hero anchor

`jtbd-help-us-enjoy-being-together` — turn spare moments into easy shared play.

## Job flow step

`job-flow-maya-start-playing-together`, step 7: play through a fair, responsive shared game. Delivery is currently 3/5; table-play feedback found that one miss ends the run and audio response does not feel immediate.

## Active anchors

- `jtbd-help-us-enjoy-being-together` — the game should create a shared musical moment.
- `jtbd-trust-this-app-with-my-life` — touch, timing, and elimination rules must feel truthful and predictable.

## Friction we're addressing

The current game ends the whole pattern when one person misses. Notes begin on release and after an awaited seek, so touch and sound feel disconnected. Although the note assets have equal 504 ms files, the game does not establish a stable musical pulse that makes their shared duration legible.

## System alignment

Constraint posture: `Extend the system`

Current system facts:
- Existing surface: guest-first local Pass the Pattern inside Connection Games.
- Existing flow: choose a difficulty, watch, repeat, add, pass, and restart after any miss.
- Existing domain: deterministic local rules are also consumed by a hidden remote implementation.
- Existing affordances: six approved 504 ms note assets, Expo Audio players, Games sound settings, player setup, and table-play styling.
- Existing convention: local/cast-first learning may precede remote parity when the server contract is kept explicit.

Constraints to preserve:
- One shared phone, named local players, no account or rules administration.
- The visible and audible tap must agree; audio failure never blocks the game.
- Remote Pass the Pattern remains unchanged and hidden during this local learning release.

Constraints we may challenge:
- A miss ends the whole run.
- Difficulty is a setup decision.
- Notes are memory cues rather than parts of a song.

## Aspirational design challenge

How might we help Maya's group build and remember a song together until one player remains, while preserving immediate play, fair timing, and one-phone simplicity?

## Out of scope

Remote rhythm synchronization, custom songs, music creation tools, accounts, scoring, and generated audio.

## Open question

Does table play show that rhythm timing adds delightful tension without making the memory job hard to understand?
