---
id: brief-todo-contextual-chat
title: Contextual Chat from To-dos and Goals
status: accepted
audiences: [audience-ai-native-life-operators, audience-burned-out-productivity-power-users, audience-aspirational-family-organizers]
personas: [Nina, Marcus, Maya]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves: [jtbd-get-help-without-retelling-my-life, jtbd-stay-in-control-of-ai-actions, jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action]
related_briefs: [brief-unified-chat, brief-todo-organization-triage]
owner: andrew
last_updated: 2026-08-05
---

# Contextual Chat from To-dos and Goals

## Context

Quick Add is efficient when the user already knows the exact To-do shape, and Search is efficient when they know what they are finding. Neither lets a person express a richer intention, ask about the inventory in front of them, or safely change a matching set. Goals has the same gap at a higher level: a person can inspect individual commitments but cannot ask across the visible inventory without leaving it. These native work surfaces need contextual doorways into the same durable Chat that already exists elsewhere in Kwilt.

## Target audience

The primary audience is `audience-ai-native-life-operators`: people who expect conversational help to be callable from the work in front of them, but who need visible scope and authoritative results before trusting it. Marcus and Maya also benefit when one natural-language request replaces repetitive To-do maintenance without creating another system to manage.

## Representative persona

Nina is looking at her To-dos when she notices work that is easier to state than to perform manually. She may want to create one richly specified action, capture several separate actions, or make the same bounded change across every matching overdue item. She expects the resulting conversation to remain available in Chat and every mutation to remain owned by To-dos or Plan.

## Aspirational design challenge

How might we let Nina converse with and act on her To-dos without leaving their spatial context, while preserving visible scope, durable Chat continuity, reviewable effects, and native capability ownership?

## Hero JTBD

`jtbd-trust-this-app-with-my-life` — contextual leverage is only valuable when the user can tell what Chat considered, what it intends to change, and what actually became real.

## Job flow step

This improves `job-flow-nina-trust-ai-with-my-life-system`, especially the underserved steps “ask questions about Arcs, Goals, Activities, and Chapters,” “let AI act proportionately,” and “inspect exactly what would change.” The current offering scores 4 because bounded evidence and proposal machinery exist, but the user must leave To-dos to invoke it and signed runtime proof remains incomplete.

## JTBD framing

When a person sees a To-do problem that is tedious to restate or edit row by row, they want to ask once from the list they are already viewing, so they can turn intent into correctly scoped native changes while remaining in control of every effect. This serves `jtbd-get-help-without-retelling-my-life`, `jtbd-stay-in-control-of-ai-actions`, `jtbd-move-the-few-things-that-matter`, and `jtbd-carry-intentions-into-action`.

## Design

The To-dos bottom dock contains Quick Add, Search, and a third circular Chat action. The Goals inventory adds one matching 48-point floating Chat action at the lower-right, where it remains reachable without competing with the masonry cards. Both use the common `navAiGuide`/messages icon already used by the capability menu; neither uses a sparkle, bot, or capability-specific AI symbol. Their accessibility labels are “Chat about to-dos” and “Chat about goals.”

Tapping Chat opens the real Unified Chat workbench in a bottom drawer at 60% height. A compact title rail names the fresh conversation `Chat about to-dos` or `Chat about goals` and later adopts its durable generated title; it carries no close button or modal controls. The grabber owns dismissal, the empty timeline carries only a subtle centered Kwilt watermark, and the composer exposes `All to-dos` or `All goals` as a removable chip once engaged. The resting composer aligns to the same mobile gutter as the timeline and is equally nested from the bottom edge. Focusing the composer expands the drawer to full height. Closing returns to the exact native list state. Opening and closing without sending creates no thread; first send creates one durable thread, and the same thread can be reopened during that capability visit or later from the ordinary Chat area.

The conversation supports four operational shapes through existing capability-owned tools:

- answer questions grounded in authoritative To-do evidence;
- create one richly specified To-do or several distinct To-dos, including dates, reminders, recurrence, and other supported fields;
- coordinate with Plan to place a created or existing To-do on the configured calendar;
- resolve every item matching a bounded request and prepare a reviewed proposal for each change, with one batch decision and no partial “all matching” success.

Examples that define the learning release:

- “Remind me to replace the furnace air filter in 10 months, and put it on my calendar.” The first phase preserves the relative date and prepares the To-do. Because the request supplies neither a calendar time nor duration, Chat must not invent them or a future Activity id. After the create receipt supplies the authoritative record, Chat explicitly asks for the missing placement details and routes the second phase through Plan. It must not claim a provider calendar event exists before native approval and an authoritative receipt.
- “Look through all my past-due to-dos and remove their due dates and reminders.” Chat must identify the complete matching set from authoritative evidence, prepare `scheduledDate: null` and `reminderAt: null` changes for each item, present them as one reviewable batch, and refuse a partial batch if it cannot cover every match.

The native To-dos inventory remains authoritative. Chat never owns Activity records, calendar bindings, reminder scheduling, confirmation policy, receipts, recovery, or undo. The older Activity Coach is not a second transcript or mutation path; it can remain only as a temporary fallback until the contextual Unified Chat route proves parity.

### UI contract

- Job: ask and operate on the To-dos in scope, then return to their native results.
- Primary action: the common Chat icon to the right of Search.
- Always show: compact conversation identity, removable scope before first send, timeline, composer, and the drawer grabber/accessibility dismissal path.
- Reveal on demand: full-height conversation when composing or reviewing dense results.
- Do not add: modal header controls, a greeting masquerading as a durable message, an AI mode, prompt carousel, embedded thread picker, second transcript, or a parallel To-do mutation implementation.

### Acceptance criteria

- The dock lays out three reachable actions without covering Quick Add, and the Chat control has the agreed icon and accessibility semantics.
- The Goals inventory exposes one matching lower-right Chat control without covering masonry content; its drawer uses plural Goals copy, `All goals` scope, and an exact Goals-list return target.
- Dismissing before first send creates no durable thread.
- The launch context is attached before the first turn runs, not afterward.
- A sent thread appears in the standard Chat history and can be resumed without silently reattaching removed scope.
- Rich creation with an explicit post-create calendar continuation, and complete-set bulk cleanup, are represented in the standing agent judgment, app-control, and all-matching contract suites.
- Every write remains proposal/receipt-backed and the native list reconciles to the authoritative outcome.
- Keyboard, drawer expansion, dismissal, interruption, VoiceOver, and signed-account durability are verified on the appropriate runtime before the brief is marked shipped.

## Success signal

In dogfood, Andrew can issue both defining requests from the To-dos list without restating where he is, review the exact intended effects, return to a correctly updated native list, and later find the same conversation in Chat. The interaction creates no empty threads, partial bulk successes, or success-looking calendar claims without a receipt.

## Open questions

- Does 60% preserve useful list orientation, or should the phone drawer open nearer full height after repeated immediate expansion?
- After real usage, should a contextual launch remain fresh-by-default or offer an explicit recent-thread continuation?
- When active saved-view filters become first-class Chat evidence, how should the scope chip distinguish capability-wide `All to-dos` from a truly bounded view query?
- When can the legacy Activity Coach entry be removed without losing any supported To-do creation or recovery path?
