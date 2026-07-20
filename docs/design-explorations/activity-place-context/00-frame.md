# Frame: Activity Place Context

## What the user said

> I often find myself wanting to set a location that is where I am. And it's not about triggering a notification when I enter or when I leave, it's just saying, this is the location that I want this to do to be relevant to.

## Restated in user voice

When I capture or edit something that belongs at the place I am now, I want to attach that place without also creating an alert, so Kwilt preserves where the Activity is relevant without demanding more attention from me.

## Target audience

`audience-aspirational-family-organizers` - Aspirational family organizers.

This is a Maya-first refinement because errands, returns, pickups, household work, and ordinary family commitments often belong somewhere even when a notification would be unnecessary or annoying.

## Representative persona

Maya is capturing a to-do while she is already at the place where it will matter again.

- Current situation: she wants to preserve the place relationship while it is effortless to identify.
- What she's trying to do: make the Activity easier to recognize, find, and act on in the right real-world context.
- Emotional state or tension: she wants useful context without configuring an automation.
- What would make this feel wrong: being forced to choose enter/leave behavior, seeing radius controls before asking for an alert, or granting background-location access just to attach a place.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - Help me make real progress in the few areas I most want to grow.

## Job flow step

`job-flow-maya-move-family-life-forward`, step 4: Know the next doable action.

Current delivery score: 2. Kwilt can capture Activities and can attach a coordinate-backed location trigger, but its current Location sheet presents a notification rule as mandatory. It does not give Maya a calm way to say only, "this belongs here."

## Active anchors

- `jtbd-carry-intentions-into-action` - A place relationship makes an Activity more doable in the right context.
- `jtbd-capture-and-find-meaning` - Capturing the place where Maya already is should take almost no setup.
- `jtbd-trust-this-app-with-my-life` - A place assignment must not silently imply tracking or notifications.

## Friction we're addressing

The current sheet begins with “Send a notification,” requires enter or leave, and exposes a boundary radius. That collapses two different intentions into one control: “this Activity is relevant here” and “interrupt me when I cross this boundary.”

## System alignment

Constraint posture: `Fit the system`

Current system facts:

- Existing surface: Activity Detail already has a Location row and a location sheet with map, current-location capture, search, trigger, radius, and Save.
- Existing user flow: opening the Location sheet currently requests location access, seeds the current coordinates, defaults the trigger to `leave`, and saves the trigger with the place.
- Existing domain/data model: `Activity.location` already supports label, latitude, longitude, optional `trigger`, and optional `radiusM`.
- Existing technical affordances: Location Offers only need to monitor Activities with explicit triggers; location metadata already contributes to Activity priority/context evidence.
- Existing UX/copy conventions: capture first, permission at the value moment, calm defaults, and explicit behavior.
- Existing product direction: Places distinguishes a place link from an alert; To-Do Action Contexts already says neither a Place nor an action context should imply a notification.

Constraints to preserve:

- Activities remain the atomic object; Place is supporting context, not a fifth primary object.
- Adding a place never blocks capture.
- No notification or background geofence without explicit opt-in.
- Existing arrive/leave alerts remain available for people who want them.
- The map/search/current-location affordances remain in the existing sheet.

Constraints we may challenge:

- The sheet's notification-first sentence and always-visible radius.
- The default `leave` trigger applied to a newly attached place.
- Treating the current coordinates as a permanently meaningful label called “Current location.”

Design implication:

The sheet should save a Place by default. An alert is a secondary, optional behavior, and boundary controls should appear only when an alert is enabled. Capturing “where I am” should store the selected point at save time and use a durable place/address label when available.

## Aspirational design challenge

How might we help Maya attach “where I am” as calm, useful context for an Activity, while preserving capture-first behavior and making tracking or notification behavior unmistakably opt-in?

## Out of scope

- Building Saved Places management.
- Automatic background detection of where the user is.
- A Place tab or place dashboard.
- New place-aware notification types.
- Automatically promoting every place-linked Activity in Recommended.

## Open question

None for the learning release; use foreground current-location access for “Use current location” and request stronger permission only if Maya enables an alert.
