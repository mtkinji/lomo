# Diverge: Where The Kwilt Agent Runtime Should Live

## Fixed design challenge

How might we let a user ask Kwilt for any outcome through in-app Chat, Phone Agent, or a future background agent, while preserving capability completeness, native ownership, proportionate permission, inspectable evidence, and authoritative results?

## Axis of variation

The alternatives vary by **where orchestration lives and where tools execute**. All four preserve Kwilt's object model: Arc is identity direction, Goal is a longer commitment, Activity is the day-level planning unit, and Chapter remains retrospective. None may auto-anchor Activities to Arcs, block capture, or turn Chat into a productivity dashboard.

## A. Mobile-Local Agent

Unified Chat owns the model loop and a registry of in-process React Native tools. It reads the local store, calls existing services and feature operations, requests user confirmation in the shared workbench, and persists runs to Supabase. Phone Agent and background agents receive separate server implementations later.

- Audience/persona fit: Excellent for Nina's immediate in-app expectation and device-integrated actions.
- Design-challenge answer: Strong capability breadth while the app is open; weak cross-channel continuity.
- System fit: Closest to the current proposal and quickest route to fixing the Plan prompt.
- Best when: The near-term goal is solely to make mobile Chat broadly useful.
- Fails when: The app is closed, a phone/background run needs the same reasoning, server data is newer than device state, or channel implementations drift.
- Four-object/capture-first check: Pass.
- Anti-pattern check: Pass, but duplicates agent behavior and undermines the “one Kwilt operator” expectation.

## B. Server-Central Agent Backend

A Supabase-hosted agent service owns threads, orchestration, context selection, model calls, tool policy, tool execution, proposals, and receipts. Mobile Chat, Phone Agent, and background triggers are channel clients. All durable domain tools execute server-side; mobile renders results and opens native destinations.

- Audience/persona fit: Strong continuity and trust through one durable audit trail.
- Design-challenge answer: Excellent for Phone Agent, background work, retries, and cross-device state.
- System fit: Reuses Supabase agent records and the server-side MCP write pattern, but moves substantial current mobile behavior behind a backend.
- Best when: Nearly every meaningful operation is server-authoritative and device state is incidental.
- Fails when: Screen Time authorization, Focus, local notification permissions, native navigation, microphone, calendar/device state, or another iOS-owned capability is required. It can also create a second implementation of operations already expressed safely in native code.
- Four-object/capture-first check: Pass.
- Anti-pattern check: Pass if server authority is not mistaken for permission to auto-plan or auto-anchor.

## C. Shared Runtime With Distributed Tool Providers

A durable server runtime owns channel-independent orchestration records, tool schemas, policy evaluation, resumability, and server-capable operations. Tools declare one or more providers: `server`, `device`, `channel`, or future `connector`. In-app Chat can execute eligible device tools through the native host bridge. Phone Agent uses server and SMS/voice channel providers. A run that requires a device-only or confirmation-gated action persists a `PendingClientAction` or proposal for the app to complete later.

- Audience/persona fit: Best match for Nina's expectation of one capable Kwilt operator without pretending every channel can do everything immediately.
- Design-challenge answer: Capability-complete reasoning, truthful execution availability, shared trust policy, and cross-channel continuation.
- System fit: Extends the durable Unified Chat records, reuses server domain operations behind MCP/Phone Agent, preserves native adapters, and gives the shared workbench a real backend contract.
- Best when: Kwilt needs one agent platform across mobile, SMS/voice, background triggers, desktop, and external connectors.
- Fails when: Provider routing is vague, schemas drift, pending device work feels like false success, or the server becomes a generic abstraction that knows too little about capability semantics.
- Four-object/capture-first check: Pass. Capture may always fall back to a durable Activity or bounded note when a richer operation cannot finish.
- Anti-pattern check: Pass with explicit receipts, calm proactive policy, no silent Arc anchoring, and channel-specific presentation.

## D. Shared Tool Catalog, Separate Channel Orchestrators

Kwilt defines shared tool schemas, risk metadata, and domain executors, but mobile Chat, Phone Agent, background agents, and MCP each own their own prompts, model loop, context selection, run persistence, and presentation. Channels share capabilities but not an agent runtime.

- Audience/persona fit: Good channel specialization; weaker continuity when the user crosses channels.
- Design-challenge answer: Broad tool coverage and less platform migration, but not one coherent operator.
- System fit: Closest to the Phone Agent brief's existing “shared action-tool substrate” and easiest to adopt incrementally.
- Best when: Channel behavior differs so materially that shared orchestration would constrain product quality.
- Fails when: risk rules, evidence selection, retries, tool semantics, and correction behavior diverge; cross-channel handoff becomes bespoke plumbing.
- Four-object/capture-first check: Pass.
- Anti-pattern check: Pass, though multiple agent personalities and inconsistent trust behavior become a product risk.

## Comparative assessment

| Criterion | A. Mobile local | B. Server central | C. Distributed providers | D. Separate orchestrators |
| --- | ---: | ---: | ---: | ---: |
| Immediate in-app capability breadth | 5 | 3 | 4 | 4 |
| Phone/background operation | 1 | 5 | 5 | 4 |
| Device-native capability truth | 5 | 1 | 5 | 4 |
| Cross-channel continuity | 1 | 5 | 5 | 2 |
| One policy/audit contract | 2 | 5 | 5 | 3 |
| Incremental adoption | 4 | 2 | 3 | 5 |
| Long-term duplication risk | 1 | 4 | 4 | 2 |
| Architectural complexity | 4 | 3 | 2 | 4 |

Scores are directional, where 5 is strongest. Alternative C has the highest implementation complexity because it acknowledges the real split between server and device authority rather than hiding it.

## Provisional recommendation

Choose **C. Shared Runtime With Distributed Tool Providers**, implemented incrementally from D rather than through a big-bang rewrite.

The right durable backend is not “the mobile local-tool runtime.” It is the shared run, policy, schema, and server-execution layer. Local mobile tools are a first-class provider attached to that runtime. Phone Agent becomes another channel host over the same threads, runs, policy decisions, server tools, proposals, and receipts; it does not depend on the app being awake and does not gain device-only tools it cannot truthfully execute.

The first architectural seam should be a portable tool definition and result contract plus one shared server executor used by both Unified Chat and Phone Agent. Plan is the best vertical proof because it requires both server-readable life context and potentially device/native calendar or confirmation behavior.

