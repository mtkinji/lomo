# Frame: Work Receipts And Build Continuity Control Plane

## What the user said

> I often bounce between lots of different buildable item when vibe coding. Sometimes I lose track of what I was working on, where I'm at with it, and what my next steps are.
>
> Codex plans are useful when I'm going to start and finish a thing in the same session, but when it persists over multiple sessions, or when its more of a complex build concept, then I start to get turned around.
>
> In my head I've already started to think that maybe I need a Codex skill that will use a tool like Kwilt to help me plan out my schedule to do these things.
>
> Yes, and could we build this into the Kwilt MCP as a plugin that comes along for the ride?
>
> There's so much emphasis on long-running builds here. But if I'm doing work I want to "get credit for it", even if it doesn't qualify as a "long-running build" In other words, I want to record it in Kwilt and mark it done too.
>
> That way Kwilt Chapters can become an even richer more complete history of what I've done.

## Restated in user voice

When I do meaningful work through Codex, Cursor, Claude Code, or another AI-assisted surface, I want Kwilt to record that work as part of my real life history, whether it is a quick completed task or a build thread that needs to continue later, so my Chapters can reflect what I actually did and I can recover the next step when there is one.

## Target audience

`audience-ai-native-life-operators` - AI-native life operators.

This concept is strongest for people who already build and think inside AI tools and want Kwilt to be available where the work is happening, not trapped behind one mobile UI.

## Representative persona

Nina, adapted to an internal builder version of Andrew.

- Current situation: She uses AI coding agents to shape product ideas, create feature briefs, implement branches, make small fixes, and occasionally resume complex work across days.
- What she's trying to become/do: Build more deliberately while letting Kwilt remember both completed effort and unfinished threads.
- Emotional state or tension: Energized by fast AI-assisted building, but aware that meaningful work can disappear from her life record if it only lives in an agent transcript.
- What would make this feel wrong to her: A new productivity dashboard, a second project-management system, invisible AI mutation of her life system, or a plugin that writes a pile of noisy micro-tasks.

## Hero anchor

`jtbd-trust-this-app-with-my-life` - Nina will only let AI operate near her life system if Kwilt is inspectable, permissioned, and reversible.

## Job flow step

`job-flow-nina-trust-ai-with-my-life-system`

Underserved steps:

- Capture from tools where she is already thinking: delivery score 2.
- AI suggests changes: delivery score 2.
- Inspect exactly what would change: delivery score 1.
- Approve, reject, or edit changes: delivery score 1.
- Undo or audit past actions: delivery score 1.

The current plugin/control-plane direction already lets agents read Kwilt context and, with write scope, create or update planning records. The gap is that agent-assisted work is not yet consistently captured as completed Activity history for Chapters, and build-continuity behavior is still mostly skill guidance rather than a mature cross-session product contract.

## Active anchors

- `jtbd-trust-this-app-with-my-life` - The plugin needs permission, preview, audit, and reversible writes before it can safely maintain durable build state.
- `jtbd-move-the-few-things-that-matter` - The user is trying to keep important work visible, whether it is done now or needs a next action later.
- `jtbd-capture-and-find-meaning` - The user wants completed work and work context captured from the tools where building actually happens, so Chapters have richer evidence.
- `jtbd-see-my-arcs-in-everyday-moments` - Build work should remain connected to identity and Goals, not become disconnected implementation checklists.

## Friction we're addressing

Codex's native plan is good for immediate execution, but it is intentionally session-scoped. Even when work starts and finishes in one session, that effort can disappear from Kwilt's lived history unless it is recorded as an Activity and marked done. When work continues across sessions, the durable state also needs enough context for the user to reassemble the build thread before they keep moving.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: The separate `kwilt-agent-plugins` repo already packages Kwilt plugin manifests for Cursor, Claude Code, and Codex.
- Existing user flow: Agents can connect to the Kwilt OAuth MCP server and, with write consent, read context and create/update user-owned planning records.
- Existing domain/data model: Kwilt uses Arcs, Goals, Activities, and Chapters. Activities are the atomic forward-planning unit; there is no separate day-level Plan object.
- Existing technical affordances: The hosted MCP server exposes Goal and Activity writes, Activity steps, check-ins, focus state, Chapter-note writes, and audit-oriented plugin packaging.
- Existing UX/copy conventions: Capture-first, calm, identity-aware, no dashboards for their own sake, no productivity score language, no silent auto-anchoring.

Constraints to preserve:

- Codex plans remain the short-lived execution surface.
- Kwilt Goals and Activities remain the durable planning surface.
- The plugin should reuse the existing `kwilt-control-plane` skill rather than create a second control-plane concept.
- The skill should not mirror every implementation checklist item into Kwilt.
- Any durable write must be inspectable, permissioned, and summarized at handoff.

Constraints we may challenge:

- The current `kwilt-control-plane` skill is activity-capture oriented, but it may need two explicit paths: a lightweight completed work receipt and a richer continuity packet.
- MCP tool schemas may need fields that make build state easier to inspect, such as status, source repo, branch, linked artifacts, next action, and open decisions.
- Plugin distribution may need to present this as a first-class capability rather than hidden skill behavior.

Design implication:

The first version should feel like a work receipt and, only when needed, a cross-session handoff layer for build work. Scheduling can be a later projection of priority and availability, but the sharper V1 problem is recording meaningful work for Chapters and preserving the next step when there is one.

## Aspirational design challenge

How might we help Nina record meaningful AI-assisted work as completed life evidence, and keep unfinished build threads recoverable across sessions, while preserving Codex plans as lightweight execution scaffolding and Kwilt as the durable, permissioned source of truth?

## Out of scope

- A standalone project-management app.
- Calendar auto-scheduling.
- A new Kwilt object type for plans.
- Automatic branch creation, PR creation, or deployment.
- Agent-written implementation micro-task spam; a receipt should summarize meaningful completed work, not every shell command.
- Silent mutation of Goals, Activities, schedules, or Arcs without a clear user request.

## Open question

What is the cleanest threshold between a lightweight completed-work receipt and a richer continuity packet?
