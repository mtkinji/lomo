# Evaluate Learning: Activity Place Context

## Learning Questions

- Do users naturally want to save a Place more often than they want to configure an alert?
- Do they understand that `Alert · Off` means no background monitoring or notification?
- Is `Use current location` the dominant capture path for context-only Places?
- Does hiding Boundary radius until alert enablement make the sheet feel simpler?
- Is a context-only Place useful later through Activity Detail, search, or Recommended, or does it become inert metadata?
- Can stronger permission requests remain confined to explicit alert enablement?
- When current and saved-home Place candidates disagree, do users understand and value a `Nearby` versus `My Costco` choice?
- Does choosing the home Place correctly keep the Activity out of the current travel context until it becomes relevant again?
- Can users answer a Place question from the Quick Add receipt without feeling that capture turned into a multi-step flow?
- Do passive generated-result chips provide enough trust without requiring confirmation of every safe enrichment?

## Evidence Plan

Evidence supporting the bet:

- Context-only Place saves occur repeatedly in Andrew's self-use and TestFlight use.
- Users can describe the state as “this belongs here, but it won't notify me.”
- No location offer or geofence is created for context-only Places.
- Existing arrive/leave alerts continue to round-trip and deliver as before.
- Users later reopen, search for, or act on context-only place-linked Activities.
- Boundary and permission controls are encountered only by users who enable alerts.
- Travel-mismatch choices resolve to the user's intended nearby/home Place without requiring a full search flow.
- Users can immediately start another Quick Add while the prior receipt remains dismissible and non-blocking.

Evidence disconfirming the bet:

- Users expect a notification merely because a Place is visible.
- Saved values remain labeled `Current location` after the user moves and become confusing.
- Context-only Places are never revisited or consumed by any useful surface.
- Editing an existing alert silently switches it off or changes its boundary.
- Foreground-only Place attachment still triggers background or notification permission prompts.
- Kwilt defaults to the nearest venue when the user actually intended the saved home Place.
- Kwilt claims travel awareness or stores travel history when it only had a one-time foreground region signal.
- The receipt grows into a dense property inspector or unanswered-question inbox.
- A location sheet opens automatically after ordinary Quick Add capture.

## Instrumentation

Track:

- Location sheet opened with no place, context-only place, or alerted place.
- Place saved with alert state `off`, `arrive`, or `leave`.
- `Use current location` selected versus search/map selection.
- Alert changed from off to on, on to off, or arrive to leave.
- Context-only Place later surfaced, opened, cleared, or converted to an alert.
- Permission prompt source and result, without storing coordinate trails.

Do not track:

- continuous location history;
- raw coordinate movement;
- background dwell at context-only Places;
- inferred home, work, health, worship, or other sensitive categories.

## Decision Rule

Proceed as permanent behavior after at least two weeks of real-device self-use or a comparable set of repeated TestFlight sessions if:

- context-only Place saves recur;
- no context-only location is registered as a geofence;
- users accurately predict alert behavior;
- existing alert reliability is unchanged;
- at least one downstream surface makes the Place useful.

Revise if the place is understood but inert: improve Activity metadata, search, or bounded Recommended consumption. Retire only if users consistently want alert behavior whenever they attach a Place and the optional state adds confusion rather than control.

## Expected Next Action

Implement and verify the Place-first Activity Location sheet as the smallest coherent learning release before expanding Saved Places or automatic place relevance.
