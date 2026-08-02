# Frame: Focus Widget

## What the user said

> I think I need a focus mode widget - one that can trigger a generic focus mode whenever.

## Restated in user voice

When I am ready to concentrate, I want one calm tap to begin a bounded Focus session without first creating or choosing a to-do.

## Target audience

`audience-burned-out-productivity-power-users`, represented by Marcus.

## Hero anchor and job-flow step

`jtbd-move-the-few-things-that-matter`, in `job-flow-marcus-move-the-few-things-that-matter`: move from deciding what matters into doing it. Kwilt currently makes Focus available from a to-do detail, but that prerequisite adds work when the intention is simply to focus now.

## Active anchors

- `jtbd-carry-intentions-into-action` - shorten the distance between intention and action.
- `jtbd-capture-and-find-meaning` - record that Focus happened without requiring administrative setup.
- `jtbd-trust-this-app-with-my-life` - make the session real, bounded, and inspectable.

## System alignment

Constraint posture: `Extend the system`.

The widget must reuse the existing Focus session store, notification, Live Activity, soundscape, and Screen Time protection runtime. A generic session is explicitly unlinked; it must not fabricate an Activity or Goal. It controls Kwilt Focus, not Apple's system Focus modes, which third-party apps cannot toggle generically.

## Aspirational design challenge

How might we help Marcus cross from intention into concentration in one tap, while preserving a truthful boundary between focused time and planned work?

## Out of scope

- Creating or completing a to-do automatically.
- Toggling an Apple system Focus mode.
- Multiple simultaneous Focus sessions.
- Ending a session directly inside the first widget release.
