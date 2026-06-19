---
id: brief-dynamic-next-best-action
title: Dynamic Next Best Action
status: accepted
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves: [jtbd-carry-intentions-into-action, jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life]
related_briefs: []
owner: andrew
last_updated: 2026-06-19
---

## Context

Activity Detail currently exposes capabilities in the bottom dock: Focus, Calendar, Send To, AI, and completion. The user has to choose the feature before Kwilt has helped them decide what actually moves the to-do forward.

## Target audience

Burned-out productivity power users need decision relief. They care less about more tools and more about whether one meaningful commitment moves today.

## Representative persona

Marcus is looking at a to-do and deciding what to do next. He will trust a recommendation if it feels practical, reversible, and not like another productivity system.

## Aspirational design challenge

How might we help Marcus decide the next honest action for a to-do, while preserving Kwilt's calm capture-first posture and keeping alternatives discoverable?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - Help me make real progress in the few areas I most want to grow.

## Job flow step

`docs/job-flows/marcus-move-the-few-things-that-matter.md`, step 5: "Decide what to do next." Current delivery score is 3 because Plan and recommendations help, but the "what now?" moment is not yet the spine.

## JTBD framing

When Marcus is looking at a to-do and is not sure whether to schedule it, work on it, break it down, ask for help, or finish it, he wants Kwilt to recommend the next honest move, so he can make progress without maintaining another productivity system.

## Design

Replace the Activity Detail capability toolbar with one stable primary action and a chevron menu. Preserve the existing circular completion button on the right as the exclusive completion affordance.

Primary button behavior:

- Tap the label side to perform the recommended action.
- Tap the chevron side to open the action menu.
- Add steps focuses the inline step entry row. It should not open the AI assistant.
- Keep alternatives discoverable in the menu: Focus, Schedule, Add steps, Ask Kwilt, Share.

Initial rule order:

1. Recommend Focus as the stable primary action for to-dos. Focus mode is generally the highest-value one-tap action.
2. Keep Schedule as the first alternate in the chevron menu, especially for unscheduled to-dos.
3. Keep Add steps, Ask Kwilt, and Share available through the chevron menu. Share should not become the default primary action.

## Success signal

The user can open an Activity Detail screen and take the next meaningful action with one tap, while still finding all former actions through the chevron menu.

## Open questions

- Should future recommendations explain why the action was chosen?
