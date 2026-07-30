# Frame: Kwilt Games Capability Integration

## What the user said

> Bring Kwilt Games formally into the Kwilt app under the Fun section header, using Money as a precedent while honoring Games' unique characteristics.

## Restated in user voice

When my family has a few unstructured minutes, I want to open the Kwilt we already use and start something enjoyable together without setup, so the moment becomes connection instead of another thing I organize.

## Target audience and persona

`audience-aspirational-family-organizers`, represented by Maya. She initiates shared moments but rejects account gates, household administration, and productivity framing around play.

## Hero anchor and job-flow gap

`jtbd-help-us-enjoy-being-together`; `job-flow-maya-start-playing-together`, especially steps 3–8. Unified Kwilt currently scores 1 because the Fun group has no Games route or playable table.

## Active anchors

- `jtbd-help-us-enjoy-being-together` — connection is the product outcome.
- `jtbd-invite-the-right-people-in` — seats, rooms, and invitations must be bounded and private.
- `jtbd-trust-this-app-with-my-life` — rules, randomness, identity, and session state must be predictable.

## System alignment

Constraint posture: `Extend the system`.

- Reuse Kwilt's capability registry, React Navigation root, session, settings, deep links, analytics, and release train.
- Give Games one global destination under Fun; its shelf is the inventory and game tables are descendants.
- Preserve Games' playful table grammar, guest-first seats, instant play, fair deterministic engines, and session-scoped remote model.
- Do not import Expo Router, a second auth/Supabase shell, standalone settings, or a nested app.
- Freeze the committed source at `7b3e209`; preserve and separately reconcile current uncommitted source edits.

## Aspirational design challenge

How might we help Maya start a joyful shared game from the Kwilt she already uses, while preserving instant guest play and Games' distinct table-native character?

## Out of scope

Full catalog and remote parity, standalone retirement, TestFlight release, and backend migration changes.
