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
last_updated: 2026-08-02
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

The small WidgetKit widget has a configurable 10, 25, or 50 minute duration. At rest it presents Focus, the duration, and one Start action. The deep link starts an explicitly standalone session through the existing Focus runtime. While any Focus session is active, the widget shows its live countdown or paused state and opens the owning in-app controls.

The in-app standalone overlay reuses the existing timer, pause/resume, soundscape, color, end, notification, Live Activity, and Screen Time behavior. The standalone identity is a runtime sentinel only and must never be resolved, displayed, or persisted as an Activity. The widget does not claim to toggle Apple's system Focus modes.

## Success signal

A configured widget reliably starts Focus in one tap, visibly becomes the same active session, and returns to controls. Users can explain that generic Focus counts as focused time without changing a to-do or Goal.

## Open questions

- Whether the three presets are sufficient after dogfooding.
- Whether a later post-session affordance should let the user explicitly connect the time to an Activity.
