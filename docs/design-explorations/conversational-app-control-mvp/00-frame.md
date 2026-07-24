# Frame: Conversational App Control MVP

## What the user said

> All I want is for a user to be able to control the app using natural language. That should be our MVP.

## Restated in user voice

When I know what I want Kwilt to do, I want to say it naturally and have Kwilt use the capability that already exists, so I do not have to navigate the app, translate my intent into fields, or maintain the system by hand.

## Target audience

`audience-ai-native-life-operators` — people who already expect AI to interpret intent and operate software.

## Representative persona

Nina expects natural-language control to be the front door to Kwilt's existing capabilities.

- Current situation: Kwilt already knows her Goals, Activities, Plan, and preferences, but using them still requires capability-specific screens.
- What she is trying to do: state an outcome once and let Kwilt complete the existing app workflow.
- Emotional tension: she wants leverage without silent or fabricated changes.
- What would make this feel wrong: a clever answer that does not perform the requested app action.

## Hero anchor

`jtbd-trust-this-app-with-my-life` — natural-language control earns trust only when the result is real, truthful, and reversible.

## Job flow step

Nina's underserved step is expressing intent and carrying it through apply, receipt, and later correction. Marcus's adjacent weak step is deciding what to do next without maintaining another planning system.

## Active anchors

- `jtbd-get-help-without-retelling-my-life` — use existing app state instead of asking the user to reconstruct it.
- `jtbd-stay-in-control-of-ai-actions` — confirm only when risk or native authorization requires it, then show the authoritative result.
- `jtbd-carry-intentions-into-action` — turn a stated intention into the existing Goal, Activity, Plan, or device behavior.

## Friction we're addressing

The work became organized around runtime completeness, timeline records, and cross-channel architecture. Those are implementation supports, not the MVP. The MVP succeeds only when representative natural-language commands complete the same jobs a user can already complete manually in Kwilt.

## System alignment

Constraint posture: `Fit the system`

Current system facts:

- Existing surface: global and contextual Chat.
- Existing flow: each capability owns reads, validation, permission, mutation, and its native result.
- Existing model: Arc, Goal, Activity, and Chapter remain authoritative; Activities are the Plan.
- Existing affordances: the operation registry, hybrid routing, bounded tools, proposals, receipts, native handoffs, and capability-owned Plan priority already exist in the delivery branch.
- Existing convention: capture stays easy; consequential or externally visible actions receive proportionate review.

Constraints to preserve:

- Chat does not invent a second data model or duplicate capability logic.
- Success requires an authoritative capability result.
- Native authorization remains native, but the conversational job stays continuous.
- Low-risk reversible capture avoids unnecessary confirmation.

Constraints we may challenge:

- Timeline presentation is not an MVP acceptance criterion.
- Phone Agent, background coordination, and cross-channel parity cannot block mobile conversational control.

Design implication: organize the MVP around user utterance -> operation -> capability result. Reuse the current runtime only where it shortens that path.

## Aspirational design challenge

How might we help Nina control every capability currently available in Kwilt by speaking naturally, while preserving capability ownership, truthful outcomes, and proportionate user control?

## Out of scope

- Perfect timeline presentation.
- Phone Agent parity as a mobile-MVP prerequisite.
- Capabilities that do not yet exist in Kwilt.
- General autonomous background projects.

## Open question

None. The user explicitly selected natural-language app control as the MVP.
