---
id: brief-focus-widget
title: Standalone Focus Widget
status: accepted
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves: [jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
related_briefs: []
owner: andrew
last_updated: 2026-08-05
---

# Standalone Focus Widget

## Context

Kwilt Focus currently begins from a to-do. The user also needs an honest generic Focus mode that can begin from the Home Screen whenever concentration matters more than organizing it first.

## Target audience

Burned-out productivity power users need less operational overhead, not another timer system to maintain.

## Representative persona

Marcus has already decided to focus. Requiring a to-do selection risks turning readiness into another planning loop.

## Aspirational design challenge

How might we help Marcus cross from intention into concentration in one tap, while preserving a truthful boundary between focused time and planned work?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - the widget reduces the activation energy of doing the thing that matters now.

## Job flow step

`job-flow-marcus-move-the-few-things-that-matter`, the transition from choosing a meaningful next move to acting. The current Focus offering is strong once an Activity is open, but generic entry is absent.

## JTBD framing

When I am ready, let me begin a real bounded session without creating maintenance work (`jtbd-carry-intentions-into-action`). Preserve the session as useful personal evidence (`jtbd-capture-and-find-meaning`) while clearly leaving it unattached to an Activity or Goal (`jtbd-trust-this-app-with-my-life`).

## Design

The small WidgetKit widget is a static Focus launcher rather than a persistent configuration surface. At rest it presents Focus and one action. Tapping opens Kwilt directly into an opaque full-page Focus interstitial with two decisions: duration and audio (including No audio). The interstitial renders the same shared setup contents as Activity Focus rather than maintaining a second control implementation. It seeds those controls from the user's recent choices but never starts until the user presses Start. While any Focus session is active, the widget shows its live countdown or paused state and opens the owning in-app controls.

The in-app standalone overlay reuses the existing timer, pause/resume, soundscape, color, end, notification, Live Activity, and Screen Time behavior. The standalone identity is a runtime sentinel only and must never be resolved, displayed, or persisted as an Activity. The widget does not claim to toggle Apple's system Focus modes.

## Success signal

The widget reliably opens the duration-and-audio full-page interstitial without showing a To-dos canvas, Start begins the selected standalone session in place, the widget visibly becomes that same active session, and tapping it returns to controls. Users can explain that generic Focus counts as focused time without changing a to-do or Goal.

## Open questions

- Whether the three presets are sufficient after dogfooding.
- Whether 10, 25, and 50 minutes are sufficient in this compact entry flow.
- Whether the explicit decision moment feels grounding or becomes repeated friction.
- Whether a later post-session affordance should let the user explicitly connect the time to an Activity.

## Spec refinement

- WidgetKit owns no duration or audio configuration; the app owns both choices at
  tap time.
- The top-level `focus` route is an opaque full-page interstitial, not a new
  capability destination. It does not render over To-dos and does not ask for an
  Activity, Goal, color, or Screen Time choice.
- Activity Focus and standalone Focus share one setup-content component. Activity
  Focus keeps its existing drawer container and activity-bound explanatory copy;
  the widget flow supplies standalone copy and a full-page container.
- The interstitial defaults to the last duration and current audio state, including No
  audio, but requires Start every time.
- Existing direct soundscape ids and `none` remain accepted by the standalone Focus
  controller for backward-compatible deep links and other callers.
- Acceptance requires route and shared-content interaction tests, generator contracts for
  the static launcher deep link, generated Swift compilation, and Home Screen tap
  through Start. Simulator proof and signed-device/TestFlight proof remain distinct.

## UI contract

- Job: when Marcus taps Focus from the Home Screen, he needs to choose a bounded
  duration and audio state so he can begin deliberately without organizing a
  to-do first.
- Primary action: Start.
- Must show: Focus identity, duration controls, soundscape control with No audio,
  and a close affordance.
- Reveal later: active timer controls after Start; Activity linkage only in the
  Activity-owned flow.
- Must not add: a second Focus setup implementation, a To-dos backdrop, a new
  persistent setting, Activity selection, or a new Focus object.
- Reuse map: setup controls -> shared `FocusSetupContent`; Activity containment ->
  existing `BottomDrawer`; standalone containment -> opaque route screen; active
  session -> existing `StandaloneFocusExperience` and focus session store.
- Required states: recent-choice defaults, No audio, entitlement rejection,
  starting, active, paused, and close.
- Proof path: Home Screen Focus widget -> `kwilt://focus?source=widget` -> full-page
  interstitial -> choose duration/audio -> Start -> active overlay.
