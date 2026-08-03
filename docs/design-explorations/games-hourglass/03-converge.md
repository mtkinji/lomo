# Converge: Games Hourglass

## Chosen alternative
**One Timer, Three Faces** extends Flip The Glass without widening the job. Physical is the hero, Classic preserves the proven touch interaction, and Simple maximizes legibility.

## Capability delta
Today, Maya cannot replace a missing 60-second hourglass from Games.

After this release, she can choose Physical, Classic, or Simple; turn the phone over or touch to start; see and hear one minute pass; receive a clear completion cue; and turn or tap again.

The release intentionally still cannot run custom durations, pause a timer, manage turns, track scores, or synchronize other devices.

## Trade-offs
- Accept fixed duration in exchange for zero configuration.
- Persist only the last-used style so repeated table use opens in the preferred presentation.
- Accept one local device in exchange for no room/session infrastructure.

## Reductive design decisions
- Enhance the existing Utilities section; do not add a game card or global destination.
- Keep one compact three-way style choice and one dominant start interaction for the selected style.
- In Physical, treat the gesture as primary and the touch action as a visible fallback.
- Show only the selected timer face, remaining seconds, back, music, and style choice.
- Provide a small reset affordance only while running; do not add pause or add-time controls.
- Refuse duration presets, tutorials, player setup, score, history, and notification permission.

## Activation
Discovery is organic in Games → Utilities. Physical uses short live state copy—**Hold upright**, then **Turn phone over**—instead of onboarding. Classic and Simple need no instruction.

## Bet
We’re betting that a realistic physical interaction plus a legible simple fallback makes the fixed one-minute utility useful across more table situations without becoming a timer dashboard. If style choice creates hesitation, reopen directly in the last-used style and reveal the chooser less prominently.

## Success signal
Andrew can reach Hourglass from the Games shelf and start a trustworthy one-minute turn in two taps, without reading instructions or configuring anything.
