# Frame: Explore Nearby Places

## What the user said

> Maybe Explore just shows recommendations as pins or items on the map coupled with a drawer to explore them as a list. I wonder how the user switches between modes.

## Restated in user voice

When I am exploring an unfamiliar place, help me notice a few worthwhile places within an easy walk without turning curiosity into planning work or confusing a possibility with somewhere I visited.

## Target audience

`audience-aspirational-family-organizers`, represented by Maya while traveling with her family.

## Hero anchor and active jobs

- `jtbd-move-the-few-things-that-matter` — make an ordinary open moment easier to turn into meaningful shared experience.
- `jtbd-capture-and-find-meaning` — preserve what was actually visited without administrative capture.
- `jtbd-trust-this-app-with-my-life` — keep location use foreground, explainable, and correctable.

## System alignment

Constraint posture: `Extend the system`.

- Reuse the full-screen Explore map, canonical Place model, existing bottom Places control, BottomDrawer, and SegmentedControl.
- Keep recommendation candidates session-scoped. They are not visited Places, Missions, or fog evidence.
- Keep exact route observations authoritative for visited history and terrain clearing.
- Preserve the existing Places visibility preference for collected Places; recommendation pins appear only while the user is explicitly browsing Nearby.

## Aspirational design challenge

How might we help Maya discover a few personally plausible places within an easy walk, while preserving the distinction between possibility, intention, and lived evidence?

## Out of scope

Background recommendation notifications, paid placement, automatic Missions, itinerary generation, public reviews, and a persistent inferred trip.
