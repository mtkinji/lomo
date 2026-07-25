---
id: brief-guided-overture-onboarding
title: Guided Overture Suite Onboarding
status: accepted
audiences: [audience-aspirational-family-organizers, audience-burned-out-productivity-power-users, audience-ai-native-life-operators, audience-faith-and-values-driven-builders, audience-life-transition-restarters, audience-private-accountability-seekers]
personas: [Maya, Marcus, Nina, Sarah, Elena, David]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-move-the-few-things-that-matter, jtbd-see-who-im-becoming, jtbd-capture-and-find-meaning, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-ftux-goal-arc-onboarding, brief-object-creation-ux-system, brief-unified-chat-foundation]
owner: andrew
last_updated: 2026-07-25
---

# Guided Overture Suite Onboarding

## Context

Kwilt is becoming a suite that can help with planning, money, memories, play, relationships, goals, and open-ended situations. A first-run ceremony built around creating one Goal and one identity Arc teaches an important part of Kwilt, but it cannot carry the whole suite. A generic home screen or empty Agent prompt has the opposite problem: it exposes breadth without giving a new person bearings.

The onboarding program therefore starts from a different claim: a broad app should not ask a person to understand its architecture before receiving help. It should demonstrate several concrete transformations at the person's pace, let them choose one useful task, and continue inside Agent with that intent already understood. Agent remains the conversational host; the owning capability still controls approvals, mutations, receipts, and the durable result.

This brief covers the product contract from initial entry through first value. The current implementation is a development-only learning release. It does not authorize replacement of the current FTUX.

## Target audience

The primary audience is `audience-aspirational-family-organizers`. Maya represents the broad, ordinary-life demand Kwilt must make legible without requiring productivity-system expertise. The program is intentionally pressure-tested against Marcus, Nina, Sarah, Elena, and David because a neutral suite introduction must not work only for one lifestyle or one preferred capability.

## Representative persona

Maya downloaded Kwilt after a general recommendation. She did not arrive through an invitation or a link to a particular task. She wants help with real family life, but she does not know Kwilt's object model and should not need to choose between Plan, Activities, Arcs, Stories, Money, Games, and Agent as product categories.

## Aspirational design challenge

How might we give Maya fast, concrete bearings across a broad Kwilt suite and help her finish one useful task, while exact invitations, resumptions, and task links keep their existing context and while no concept is presented as already shipped?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — The opening must help a person move something real, not merely understand Kwilt. The suite earns the right to explain its deeper identity model after demonstrating practical relevance.

## Job flow step

`job-flow-maya-move-family-life-forward`, especially **See what matters** (2), **Know the next doable action** (2), **Schedule or hand off** (2), and **Family participation** (2). Current Kwilt surfaces can perform pieces of these jobs, but an unscoped new person cannot yet tell where to begin without learning the system first.

This onboarding brief improves orientation and the handoff into those steps. It does not by itself raise their delivery scores; the selected capability must still deliver the promised result.

## JTBD framing

When someone downloads Kwilt without a specific destination, they need to see a few recognizable things Kwilt can help them do and choose one without learning the suite's vocabulary. The opening should preserve a path toward identity and meaning, accept unlisted needs through Agent, and keep invitations, private context, permissions, and mutations bounded to the capability that owns them.

## Product point of view

Kwilt onboarding is **orientation followed by progressive activation**, not universal account setup.

1. **Honor context first.** Exact task links, invitations, authoritative resumptions, and returning sessions bypass generic orientation.
2. **Give unscoped people bearings.** A short `Show -> Choose` overture demonstrates several concrete tasks without requiring capability names or automatic pacing.
3. **Preserve conversational continuity.** Every overture exit opens Agent with either the selected task or an explicit unscoped handoff, plus one useful opening question.
4. **Start one real task.** Agent interprets and routes; the selected capability owns permissions, approvals, creation, correction, and receipts.
5. **Finish at first value.** Reaching Agent or a capability screen is not activation. The person must obtain the observable result promised by the offer.
6. **Teach the suite progressively.** Later capability education appears when the person's current work makes it relevant. New capabilities do not make first-run longer.

The Agent is the continuous guide for every unscoped first-run path, not one offer among several and never a blank prompt. The overture supplies enough context for Agent to ask one relevant question immediately. Agent may interpret, clarify, and propose; it must not silently claim capability access or bypass capability-owned approvals and receipts.

## Entry precedence

Entry is resolved before any overture UI appears:

| Priority | Starting point | Entry behavior |
| --- | --- | --- |
| 1 | Exact task or authoritative deep link | Open the exact native destination |
| 2 | Goal or household invitation | Open the bounded invitation |
| 3 | Authoritative resume | Resume the interrupted work |
| 4 | Returning user | Open the normal shell; offer reorientation only voluntarily |
| 5 | Unscoped new download assigned to the experiment | Open Guided Overture |
| 6 | Any other new download | Keep the current FTUX during the learning release |

A campaign source is not automatically scoped intent. It bypasses the overture only when it carries a destination Kwilt can honor.

## The overture

The overture uses inexpensive native composition rather than video:

- one full-screen task transformation at a time;
- a task, a concrete result, and a simple icon/color treatment;
- explicit `Back`, `Next`, and `Start here` controls on every scene;
- no timer, autoplay, or gesture required to keep up;
- `Skip to Kwilt` at every moment, which opens Agent with an unscoped opening question;
- a complete, scrollable chooser after the last scene;
- the same choices and meaning when motion is reduced or a screen reader is active; and
- `Something else` as an honest path into Agent.

The Stage 1 v2 editorial composition is:

1. Plan tomorrow around what matters.
2. Catch a bill before it surprises me.
3. Turn a family photo into a story.
4. Pick a game everyone can play.
5. Invite someone to help me follow through.
6. Figure out what to do first this week.

These are research offers, not permanent navigation. The composition stays capped at six and includes at most one offer per capability. New capabilities enter the candidate registry; they do not append another scene.

## Scalable offer contract

Every candidate offer defines:

- stable offer and capability IDs;
- concrete task label;
- observable result label;
- scene transformation;
- deterministic Agent opening question;
- coverage tag;
- availability: `concept` or `live`;
- real native destination when live; and
- observable first-value result when live.

A capability can appear in concept mode before it is built. Agent receives that availability boundary and must not claim the capability is connected; the opening can still test whether the selected task begins with a credible question. A candidate enters live mode only when its route and first-value contract are both real. Editorial composition and opening questions remain versioned and reviewed; Stage 1 does not use AI-generated offer copy or opaque personalization.

## First-value contracts

The current live offers have these completion boundaries:

| Offer | Destination proof | First-value proof |
| --- | --- | --- |
| Add a to-do before I forget | Agent asks what needs remembering | A capability-owned proposal can be approved and the new to-do can be opened again |
| Plan tomorrow around what matters | Agent asks what already has to happen | A capability-owned proposal can be approved and at least one priority is placed on a specific day |
| Turn an idea into a goal I can start | Agent asks what the person wants to make true | A capability-owned proposal can be approved and a concrete Goal is saved |
| Ask Kwilt to help me sort something out | Agent asks for the messy version | Agent returns a useful next move without silently changing Kwilt data |

The route and first-value columns are separate gates. A navigation assertion cannot prove activation.

## Permissions, identity, and account setup

- Do not ask for notification, calendar, photo, financial, location, contacts, or Screen Time access globally.
- Let the selected capability explain why it needs access at the moment the person requests the related task.
- Ask for authentication when it is necessary to save, sync, invite, or retrieve private data—not as a conceptual preamble.
- Do not require Household creation, Goal creation, Arc creation, or profile completion before an unrelated task.
- Preserve Goal-to-Arc creation as the progressive onboarding path when a person chooses a goal or identity-shaped task.

## Progressive onboarding after first value

The first successful task should leave three things behind:

1. the promised result;
2. a clear place to return to it; and
3. at most one relevant next capability offer.

Examples:

- After planning tomorrow, offer to protect time for one item—not a tour of Activities.
- After creating a Goal, reveal the Arc relationship through the existing Goal-to-Arc grammar.
- After saving a story, offer to invite one family member only if sharing is relevant.
- After Agent helps sort a week, propose a typed Plan or To-do action with the owning capability's approval and receipt behavior.

Progressive offers are dismissible, do not block the owning workflow, and do not repeat after dismissal unless the context materially changes.

## Research and release program

### Stage 1 — local comprehension lab

- Manually launched from Developer Tools.
- Every task and skip path opens Agent with a deterministic, context-specific first turn.
- Portfolio context tells Agent when a capability is conceptual so it cannot imply connected access.
- Live tasks continue from Agent into capability-owned proposals and first-value paths.
- Five to eight moderated sessions across at least four persona patterns.
- No production assignment, analytics, or onboarding-state mutation.

### Stage 2 — hidden internal first-run

- Fresh internal accounts only.
- Assignment explicitly recorded.
- Exact task, invitation, resume, and returning-user bypasses enabled.
- Capability-owned first value exercised end to end.
- Event collection limited to interaction facts; no task text or private life details.

### Stage 3 — production experiment

- Separately approved experiment against the current FTUX.
- Stable allocation and composition version.
- Guardrails for auth completion, first meaningful action, permission denial, crashes, and support contacts.
- Evaluate first value and return behavior, not montage completion.

## Measurement contract

When production instrumentation is authorized, the minimum event sequence is:

`started -> scene_seen* -> offer_selected|skipped_to_agent -> agent_handoff_arrived -> capability_handoff_arrived -> first_value`

Optional terminal events are `something_else`, `chooser_seen`, and `exited`.

Every event carries only the fields necessary to interpret the program:

- composition version;
- release stage and assignment variant;
- starting-point class;
- offer ID and scene index when applicable;
- standard, reduced-motion, or screen-reader presentation mode;
- elapsed time; and
- destination/first-value contract version.

Do not capture participant answers, task titles, financial details, photos, invitation recipients, Agent prompts, or other private content in onboarding analytics.

## Success signal

Stage 1 advances only when the pre-registered evaluator returns `advance`:

- every participant recalls at least three materially different forms of help;
- at least four of five or six of eight participants choose without facilitator explanation;
- at least 80% predict a next step consistent with the chosen offer;
- nobody mistakes a concept for a shipped capability;
- every selection and skip path opens Agent with a relevant, non-blank first turn;
- every live offer reaches its observable first-value result;
- standard, reduced-motion, and screen-reader modes expose equivalent choices and meaning; and
- replay preserves onboarding state, permissions, and domain data.

Production success is a higher share of unscoped new users reaching one meaningful first-value result and returning to its owning capability, without worse completion or trust outcomes for exact-entry users.

## Stop and hold rules

Hold if the overture reads like advertising, if relevant tasks cannot be distinguished, if Agent appears to act silently, if Sarah cannot perceive any connection to what matters, or if participants expect capabilities Kwilt cannot credibly deliver.

Stop the program if breadth can be communicated only by adding more scenes, making inferred identity claims, or presenting concept work as live. In that case the portfolio or capability delivery—not onboarding—is the constraint.

## Open questions

- Does fixed scene order create a first/last-position bias large enough to require counterbalanced research variants?
- After a selected task reaches first value, what is the smallest useful explanation of where that result now lives?
- Which capability can provide the strongest production first-value path without requiring sensitive permissions?
- Can Sarah recognize Kwilt's identity depth from task transformation alone, or does one live task need a concrete Goal-to-Arc reveal?
- What voluntary reorientation should Elena receive after a long absence, separate from first-run onboarding?
