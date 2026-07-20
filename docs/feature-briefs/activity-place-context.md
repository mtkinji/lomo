---
id: brief-activity-place-context
title: Activity Place Context
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
related_briefs: [places-system, todo-action-contexts, geolocation-activity-offers]
owner: andrew
last_updated: 2026-07-20
---

# Activity Place Context

## Context

The current Activity Location sheet assumes that choosing a place means configuring an enter/leave notification. In ordinary use, the user often wants only to preserve that an Activity belongs at the place where they are now. The domain already allows a location without a trigger; the UI currently collapses Place context and Alert behavior into one required rule.

Design-loop source artifacts live in [`docs/design-explorations/activity-place-context/`](../design-explorations/activity-place-context/).

## Target audience

Aspirational family organizers frequently handle errands, returns, pickups, household work, and other commitments that belong somewhere. Attaching that context should be easier than setting up an automation.

## Representative persona

Maya captures or edits an Activity while she is already at the relevant place. She wants to preserve “this belongs here” without deciding whether Kwilt should interrupt her on arrival or departure.

## Aspirational design challenge

How might we help Maya attach “where I am” as calm, useful context for an Activity, while preserving capture-first behavior and making tracking or notification behavior unmistakably opt-in?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - Place context matters when it makes an ordinary Activity easier to recognize and act on in the situation where it becomes doable.

## Job flow step

`job-flow-maya-move-family-life-forward`, step 4: Know the next doable action. Current delivery score: 2. Kwilt can store Activity location metadata and run explicit location alerts, but its current Activity UI does not let Maya express relevance without interruption.

## JTBD framing

When an Activity belongs at the place I am now, I want to attach that place without also creating an alert, so Kwilt preserves useful action context without turning every place relationship into tracking or notification behavior. This serves `jtbd-carry-intentions-into-action`, `jtbd-capture-and-find-meaning`, and `jtbd-trust-this-app-with-my-life`.

## Design

### Core behavior

The existing Activity Location sheet becomes Place-first:

1. The map plus place/search/current-location control selects where the Activity is relevant.
2. An `Alert` control defaults to `Off` for a newly attached Place.
3. Selecting `When I arrive` or `When I leave` progressively reveals `Boundary radius`.
4. Save always stores the selected label and coordinates. It stores `trigger` and `radiusM` only when Alert is enabled.
5. Reopening the sheet preserves the exact distinction between a context-only Place and an alerted Place.

The Activity Detail summary should communicate the result without technical language:

- Context only: `Location · <place label>`
- Alert enabled: `Location · <place label> · arrive` or `· leave` using the current compact convention, with future copy refinement allowed.

### Permission contract

- Search and map pin selection do not require current-location permission.
- `Use current location` requests only the minimum access needed to read the current point.
- Saving a context-only Place does not request notification or background-location permission and does not register a geofence.
- Selecting an arrival/departure Alert enters the existing explicit alert permission path.

### Data contract

Use the existing optional shape:

```ts
location?: {
  label?: string;
  latitude: number;
  longitude: number;
  trigger?: 'arrive' | 'leave';
  radiusM?: number;
} | null;
```

For a context-only Place, omit both `trigger` and `radiusM`. Do not normalize a missing trigger to `leave` when initializing, comparing, or saving draft state.

### Current-location label

“Current location” describes a capture action, not a durable place name. At save time, prefer a best-effort resolved place/address label. If resolution is unavailable, use a stable fallback such as `Pinned place`; never imply the saved point will follow the user's future location.

### Downstream behavior

- Location Offers and geofence reconciliation must ignore a Place with no trigger.
- Context-only Place can support Activity Detail, search, explicit place/context inspection, and bounded Recommended reasoning.
- Coordinates alone must not broadly boost the Activity. Place relevance requires a current reliable signal such as explicit search/view/context or confirmed foreground place match.

### Automatic assignment from the to-do

Natural Activity language can populate the formal Places interpretation without forcing the user through the Location sheet. `Pick up prescriptions from Costco` should produce a broad `Costco` Place target and `pickup` intent automatically when confidence is high.

Resolution is deliberately layered:

- If one user-approved Saved Place strongly matches Costco, automatically link the Activity to it and make the result correctable.
- If the Activity is captured while the user explicitly supplies current location and one nearby Costco result matches that point, link a specific task-scoped Costco candidate.
- If multiple Costcos are plausible, retain the broad target/candidate set and ask which one only when a specific behavior needs it.
- Do not call a map search merely because the word Costco appears unless current/place context or an explicit action makes resolution useful.
- Do not create a Saved Place, notification, or geofence from Activity text alone.

This lets automatic assignment reduce setup while keeping three states honest: `related to Costco`, `linked to this Costco`, and `remembered as My Costco`.

When the current region and Saved Place disagree, add a fourth honest decision: `near me now` versus `my saved place later`. For example, while visiting family in another state, a post-capture Costco card should offer:

- `Nearby · <current city/state>`;
- `My Costco · <home city/state>`;
- `Any Costco`;
- `Choose another`.

Do not default to Nearby. Choosing the home Costco is meaningful scheduling/context evidence: the Activity should remain associated with home and should not rise merely because the user is near a different Costco while traveling. Current-region comparison must come from foreground permission or explicit trip scope and must not create a passive travel history.

### Quick Add receipt

Quick Add cannot dedicate the composer or a large automatic sheet to confirming every generated result. After saving, show a compact receipt directly above the collapsed dock:

```text
Created · Pick up something from Costco

Costco?   [Nearby] [My Costco] [Any]    Review ›
```

- The Activity exists before enrichment or response.
- The receipt can update asynchronously as Place candidates become available.
- Safe, reversible enrichment such as steps or details can apply automatically and appear as inspectable summary chips.
- Ambiguous Place resolution gets direct choices with no preselection.
- Permissioned behavior gets a `Set alert` action; the full Place/Alert sheet opens only after tap.
- The dock remains available for the next capture.
- Dismissal falls back to the safest broad Place target and no alert. It does not create a review queue.

This receipt replaces the current automatic location-recommendation `BottomGuide` as the default Quick Add containment shape. Activity Detail remains the durable place to inspect or correct the result later.

### Reductive decisions

- No new Activity Detail row, screen, tab, or onboarding.
- No radius while Alert is Off.
- No Saved Places or place-learning flow.
- No new notification type.
- No background sensing for context-only Places.

### Activation

The existing Location row is the activation point. The reordered sheet teaches the contract in place; no separate education is required.

### Learning release

Ship first through a local build, then TestFlight after simulator verification. The release must use real current-location permission behavior and real Location Offer registration so the trust boundary is proven rather than mocked.

## Success signal

Users repeatedly save context-only Places, especially through `Use current location`; can correctly predict that no notification will fire; and later benefit from the Place through Activity retrieval or a bounded next-action surface. Existing arrive/leave alerts continue to work unchanged.

## Spec refinement

### Decisions resolved

- Default state for a newly attached Place: Alert Off.
- Trigger/radius persistence: omitted when Alert is Off.
- Boundary visibility: only while arrive/leave is selected.
- Permission sequencing: foreground current-point access for “Use current location”; stronger permission only for alert enablement.
- Existing triggered Activities: preserve their current trigger and radius exactly.

### Acceptance criteria

- A new Place can be saved with no `trigger` and no `radiusM`.
- A context-only Place round-trips through close/reopen without becoming `leave`.
- No context-only Place is registered with Location Offers or causes a notification.
- Enabling arrive/leave reveals radius and persists the full existing rule.
- Turning Alert Off removes trigger/radius without removing label/coordinates.
- Clearing Location still removes the full location value.
- The Activity summary distinguishes context-only and alerted Place states.
- Permission prompts are attributable to the action that needs them.
- Regression tests cover draft dirty state and persistence for no-alert, arrive, leave, editing, and clearing.
- Simulator verification covers the provided sheet state plus a saved context-only round trip.
- `Pick up prescriptions from Costco` can create a broad inferred Place target without coordinates or interruption.
- One strong Saved Place match can link automatically; multiple plausible matches remain unresolved until a value moment.
- Every automatic link records provenance/confidence and can be changed or removed.
- A material current-region versus Saved Place mismatch offers both `Nearby` and `My Costco` without preselecting either.
- Choosing `My Costco` prevents the Activity from becoming relevant only because a different Costco is nearby during travel.
- Quick Add shows generated Place questions in a compact non-blocking receipt rather than automatically opening a `BottomGuide`.
- Safe generated enrichment is summarized and correctable without requiring confirmation; ambiguous or permissioned behavior remains unapplied until chosen.
- The user can begin another Quick Add while the receipt is visible.

### Intentionally deferred

- Whether a direct `Use where I am` shortcut belongs outside the sheet; decide from usage evidence.
- Saved Place creation and repeated-place suggestions.
- Broader place search, grouping, and recommendation UX.

## Open questions

None blocking implementation. The exact fallback label can follow the current geocoding affordances as long as it is stable and does not remain misleadingly dynamic.
