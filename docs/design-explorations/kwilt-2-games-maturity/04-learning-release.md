# Learning Release: Kwilt 2.0 Games maturity

## Concept To Build

An earned Games shelf that starts immediately and only gives production billing to tables with a complete shared loop.

Clue Circle's learning slice is a short rapid-guessing circle: each finder holds the phone outward, the group helps them guess, and forward/correct or backward/pass both reveal the next target until time expires.

## Capability Delta

Today, the user cannot:
- start most local games without filling default name fields;
- distinguish established tables from lower-confidence prompt activities;
- use shelf cues to choose by time and energy.

After this release, the user can:
- tap Play now into Show of Hands with no setup;
- start any other local game with neutral Player names;
- choose using concise duration and energy cues;
- access lower-confidence games in a development Workshop without exposing them as 2.0 promises.

Still intentionally not supported:
- promotion based only on tests or implementation completeness;
- invasive conversation capture or public competition.

## User Experience

Games opens with one quick recommendation, followed by release-ready tables. Each card says how long and what kind of energy to expect. In development, Workshop tables appear separately with candid playtest framing.

## Existing Product Relationship

This enhances the existing shelf, typed catalog, and shared setup. It does not add a new capability or replace any game domain.

## Buildable Slice

Must be real:
- typed maturity and choice metadata;
- production filtering and development Workshop grouping;
- direct no-setup launch for Show of Hands;
- optional local player names with neutral fallbacks;
- tests for catalog filtering and setup behavior.
- a deterministic Clue Circle turn state machine with timed turns, immediate correct/pass advancement, per-finder results, and one cooperative total;
- physical motion controls with visible touch fallbacks and success/pass feedback;
- enough original family-safe targets for repeated rapid rounds.

Can be thin or temporary:
- manual playtest notes outside the app.

Intentionally excluded:
- new game mechanics and analytics infrastructure.
- deck commerce, custom content, teams, video recording, remote Clue Circle, and automatic claims that the revised loop is fun.

## Release Channel

Local build first, then TestFlight only after changed-file verification and manual table sessions. Production remains gated by catalog status.

## Brand-Goodwill Guardrails

- Workshop never appears in production by default.
- Labels describe the experience, not unsupported quality claims.
- Local names are optional; remote identity remains explicit where required.

## Reversibility

Promotion or withholding is catalog metadata. No migration, durable state, or destructive data operation is involved.

## Permanent Product Threshold

At least three sessions across two different groups reach first action without coaching, finish a round, and produce an unprompted replay request in two sessions; no recurring confusion or child-diminishing dynamic remains.
