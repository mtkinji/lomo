---
id: brief-focus-mode-education
title: Focus mode education
status: draft
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action]
related_briefs: [brief-home-today-orientation]
owner: andrew
last_updated: 2026-05-12
---

# Focus Mode Education

## Context

Focus mode already helps a user turn a to-do into a protected work session, but the entry point is tucked into the Activity detail action dock. The app review notes made that hiddenness visible: even a motivated reviewer needs instructions to find it. This brief scopes in-app education that teaches Focus at the Activity moment without adding a competing global onboarding layer.

## Target audience

`audience-burned-out-productivity-power-users` needs Kwilt to reduce system upkeep, not create more surfaces to manage. Focus education matters for Marcus because it should help him notice the next useful move from an Activity detail page, then get into motion.

## Representative persona

Marcus has a real to-do in front of him and enough productivity vocabulary already. He does not need a new workflow pitch. He needs a calm cue that Focus can protect time for this specific Activity when he is ready to move it.

## Aspirational design challenge

How might we help Marcus turn a concrete Activity into a protected next action, while preserving Kwilt's calm app shell, Activity canvas, and non-shaming product voice?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - Focus education serves Marcus by making the Activity detail page better at answering "what now?" without becoming another dashboard or productivity system.

## Job flow step

`job-flow-marcus-move-the-few-things-that-matter` names "Decide what to do next" as a step with a current delivery score of 3. The gap is that Marcus needs stronger "what now?" decision relief. Focus education improves discoverability of an existing next-action affordance inside the Activity canvas.

## JTBD framing

When Marcus is looking at a concrete Activity, he wants a low-friction way to protect time for it, so the intention becomes trusted follow-through instead of another item in the system. The work serves `jtbd-move-the-few-things-that-matter` by making the Activity detail page more action-oriented, and `jtbd-carry-intentions-into-action` by lowering the activation energy from intention to session.

## Design

Use the existing Activity detail education pattern, not a new tooltip system. Add a one-time coachmark anchored to the Focus action in the left action dock. The coachmark appears only when the Activity detail canvas is otherwise calm: no onboarding guide, no active sheet, no editing keyboard, no combobox, no Focus overlay, and no completed Activity.

The coachmark should be skippable and mark itself seen when the user taps the Focus button or dismisses the coachmark. The copy should stay practical: Focus starts a timer for this to-do and can include optional soundscape audio when the user wants fewer distractions.

The Focus sheet remains the intent-confirmation surface. Its intro copy should reinforce the value after the user taps Focus, but it should not become a second onboarding modal. It should explain that the session is tied to this to-do and that the user can pick a duration before starting.

## Success signal

Users can find Focus from an Activity detail page without external instructions, and the education does not feel like a separate global onboarding layer. A practical product signal is more first Focus sheet opens or first completed Focus sessions among users with Activities, without increased prompt dismissal or paywall confusion.

## Open questions

- Should the Focus coachmark be shown after first-time onboarding only, or can it be part of the onboarding-created Activity detail guide once that flow has settled?
