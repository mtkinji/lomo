# Frame: Unified Chat Capability-Complete Local Tools

## What the user said

> The expectation of Chat is that users can ask it whatever and it can handle it. The app has access to tools, so it should be able to perform any function that exists across the entire app. Start there, then dial it back for important cases.

## Restated in user voice

When I ask Kwilt for help in ordinary language, I want it to understand the request, use the same capabilities available elsewhere in the app, and carry the work through to a real result, so I do not have to know Kwilt's navigation, internal capability boundaries, or special command phrasing before Chat can help me.

## Target audience

`audience-ai-native-life-operators` — people who already expect AI to reason, retrieve context, use tools, and complete work across a connected system.

## Representative persona

Nina expects Chat to be a general conversational control surface over Kwilt rather than a small collection of pre-routed demos.

- Current situation: She has enough Goals, To-dos, Plan commitments, Chapters, settings, and connected capabilities that manually navigating and restating context creates avoidable work.
- What she is trying to do: Express an outcome once and let Kwilt determine which native capabilities are needed to answer or act.
- Emotional state or tension: She is ready to grant broad functional reach, but expects consequential actions to remain inspectable, permissioned, and reversible.
- What would make this feel wrong: A confident "ask anything" surface that fails on ordinary phrasing, silently lacks most app capabilities, or lets model judgment bypass native validation and authorization.

## Hero anchor

`jtbd-trust-this-app-with-my-life` — Chat earns trust when broad conversational reach resolves into truthful, capability-owned results with proportionate control.

## Job flow step

Primary job flow: `job-flow-nina-trust-ai-with-my-life-system`.

This direction changes the interpretation of several existing steps:

- **Establish bounded request scope:** scope should be selected dynamically from a capability-complete local tool catalog, not limited by a hand-written intent allowlist.
- **Retrieve inspectable evidence:** every supported app capability should be able to expose typed read tools and provenance appropriate to its domain.
- **Let AI act proportionately:** tool availability starts broad; policy determines whether a call reads, drafts, asks for confirmation, or executes.
- **Apply with authoritative receipt:** local tools must delegate to the same native domain operations used by the owning capability and return authoritative results.

The current delivery score of 4 for these steps describes the Goals/To-dos/Chapters vertical slice, not capability-complete Chat. The dogfooding prompt “What should I add to my plan tomorrow?” demonstrates the gap: a lexical router exits before model reasoning, Plan is absent from the Chat capability id union, and no local Plan tools participate.

## Active anchors

- `jtbd-get-help-without-retelling-my-life` — Chat should retrieve the minimum useful native context without requiring the user to identify the owning feature.
- `jtbd-carry-intentions-into-action` — an answer should be able to become a real native result when the request calls for action.
- `jtbd-understand-why-ai-suggested-this` — tool results, evidence, recommendation reasoning, and limits remain inspectable.
- `jtbd-stay-in-control-of-ai-actions` — risk policy, confirmation, receipts, correction, and undo preserve the user's authority without shrinking the tool catalog by default.

## Friction we're addressing

Unified Chat currently presents a broad conversational surface over a narrow deterministic router. Ordinary advisory language containing an action verb can be mistaken for a mutation, supported capabilities are hard-coded to a small union, and the default Chat model call receives no callable local tools. The result is a system that can look agentic in the timeline while being unable to reason and act across most of Kwilt.

## System alignment

Constraint posture: `Bend the system`.

The current allowlist-first routing constraint is the problem. Preserve native ownership, durable runs, visible evidence, typed proposals, receipts, exact return, and correction; replace the closed router with a capability-complete tool runtime and explicit risk policy.

Current system facts:

- Existing surface: Unified Chat already owns a durable thread, composer, run timeline, evidence, proposal, receipt, feedback, stop, steer, and resume experience.
- Existing user flow: a regex policy classifies the request, selects from Goals/To-dos/Chapters, injects bounded evidence, makes one model request, and optionally persists one Activity proposal.
- Existing domain/data model: each native feature already owns stores, services, validation, navigation, and mutation paths; Plan already has deterministic recommendation, conflict, calendar commit, and daily-plan history behavior.
- Existing technical affordances: `sendCoachChat` can send function definitions and execute local tool calls in legacy modes; Unified Chat has a capability adapter abstraction and durable operation/receipt records; the hosted MCP separately exposes typed Kwilt tools for external clients.
- Existing UX/copy conventions: tools and runs remain internal concepts; the user sees meaningful progress, evidence, recommendations, confirmation only when warranted, authoritative outcomes, and native return paths.

Constraints to preserve:

- Native capabilities remain the source of truth for validation, authorization, mutation, conflicts, receipts, undo, and navigation.
- The model never receives arbitrary store mutation access or imports screen callbacks directly.
- Tool results are typed, bounded, owner-scoped, and safe to persist or project.
- High-impact, destructive, externally visible, financial, household, device-control, and permission-changing operations may require confirmation or remain unavailable until their capability policy is proven.
- Chat does not need to call Kwilt's remote MCP server; local Chat and external MCP may share domain operations and schemas without sharing transport or credentials.

Constraints we may challenge:

- A fixed request-class regex as the authority over which capabilities may participate.
- A hard-coded capability id union that must be edited before Chat can discover an existing app function.
- One model pass and one optional proposal as the universal run shape.
- “First vertical slice” restrictions surviving as the permanent Chat architecture.

Design implication:

Every app function intended for user operation should have a typed local-tool registration as part of its feature contract. Unified Chat should plan and iterate over those tools until it can answer, needs a human decision, or reaches a truthful boundary. A deterministic policy layer—not the model and not an accidental omission—decides which tools can auto-read, auto-execute, require review, or are temporarily denied.

## Aspirational design challenge

How might we help Nina ask Kwilt for any outcome in ordinary language and let Chat reason across every native capability, while preserving native ownership, proportionate permission, inspectable evidence, and authoritative results?

## Out of scope

- Calling the hosted MCP from the mobile app merely to reach local functions.
- Giving the model raw Zustand setters, navigation objects, database clients, secrets, or arbitrary code execution.
- Silently executing consequential operations because they appear in the catalog.
- Replacing native capability screens with a Chat-only interaction model.
- Claiming capability completeness for functions that do not yet have a truthful typed adapter, validation path, or authoritative result.

## Open question

None at the frame level. The next phase should explore how to make capability completeness enforceable without turning the first implementation into a risky all-at-once rewrite.
