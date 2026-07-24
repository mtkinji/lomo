# Converge: One Kwilt Agent Runtime, Many Tool Providers

## Decision

Choose **C. Shared Runtime With Distributed Tool Providers** as the destination architecture.

The legacy `AgentWorkspace` is a migration source, not a competing destination. Its contextual tool definitions, domain workflows, focused workspace context, and proposal cards should move behind the shared runtime one capability at a time. `ChatMode` becomes a discovery prior; legacy direct-write execution does not become the new policy layer. See [`06-legacy-capability-migration.md`](06-legacy-capability-migration.md).

Kwilt Chat, Phone Agent, background agents, desktop, and external AI clients should share one durable agent contract. They should not all share one execution environment. The coordinator owns the run; capability providers own truthful execution.

This is the key distinction:

- The **agent runtime** owns intent interpretation, context selection, tool discovery, policy checks, ordered execution, interruption, resumability, proposals, receipts, and the visible answer.
- A **tool provider** owns an operation in the environment where it can be performed authoritatively: `server`, `device`, `channel`, or `connector`.
- A **capability** owns domain meaning, validation, permission, mutation, rollback, and the native destination. Chat never recreates those rules in prompts.

The app therefore does not call its own MCP server. MCP is one projection of the same server-capable tool catalog for external clients. Mobile uses typed local adapters for device tools and authenticated server calls for server tools.

## Why this wins for the personas and jobs

Nina gets one operator that can reason across her Kwilt context and continue across channels without inventing success when a device action is unavailable. Marcus gets less interface and maintenance work: he can state the outcome and let Kwilt assemble the bounded steps. Maya and Sarah get household-aware actions whose member, device, and caregiver scopes remain explicit. Elena and David get recommendations grounded in real capacity, not generic productivity advice.

The decision best serves the primary job, `jtbd-trust-this-app-with-my-life`, because capability breadth is paired with inspectable execution. It also raises the job rather than merely fixing a bad reply: the user does not need to learn Kwilt's navigation or command vocabulary before Kwilt can help.

## Runtime shape

```text
In-app Chat       Phone/SMS       Background       MCP/desktop
      \               |              |                /
                  channel adapters
                         |
                 durable agent runtime
       thread -> run -> plan -> steps -> result
          |         |       |         |       |
       context   discovery policy  proposals receipts
                         |
                   tool provider router
               /          |          |          \
          server       device      channel    connector
        Supabase     iOS/native   SMS/voice   calendar/etc.
```

### Portable contracts

Every tool definition must carry:

- stable id, version, capability owner, human purpose, and input/output schema;
- provider availability and prerequisites;
- read/write effect, reversibility, privacy class, and confirmation policy;
- idempotency behavior and authoritative result semantics;
- a native return destination when the operation creates or changes Kwilt state.

Every tool execution returns one of a small set of envelopes:

- `completed` with authoritative data and optional receipt;
- `proposed` with a typed, reviewable operation;
- `pending_client_action` when an eligible device must finish the step;
- `needs_input` when a material ambiguity cannot be resolved safely;
- `unavailable` with a truthful boundary and useful alternative;
- `failed` with retry and reconciliation metadata.

The model may choose and sequence tools, but it does not decide whether a protected operation is allowed. Deterministic policy evaluates the tool definition, current permission, channel, household scope, and requested effect.

## Capability-complete does not mean prompt-complete

Kwilt should eventually have a tool or explicit exclusion for every meaningful user operation across the app. It should not send hundreds of schemas to the model on every turn. The runtime first discovers a small capability set from the request and visible context, then loads only the relevant tools. General questions can stay ordinary conversation with no tool call.

Completeness is measured against user outcomes, not UI controls. “Schedule these errands around tomorrow's calendar” needs a Plan operation. “Set this button's expanded state” does not.

## Permission ladder

The default policy is proportionate to consequence:

1. Read and explain bounded context without confirmation when already authorized.
2. Auto-apply explicit, low-risk, reversible capture where the capability policy permits it.
3. Propose reviewable changes when scope, timing, or interpretation matters.
4. Require explicit confirmation for consequential, external, shared, financial, household, or hard-to-reverse effects.
5. Refuse or hand off operations the channel cannot perform safely.

STOP/START/HELP, Twilio signature validation, quiet hours, rate limits, authentication, and emergency or specialist boundaries remain deterministic channel controls outside the model loop.

## Deliberate reductions

- No second generic “agent object model” over Arcs, Goals, Activities, and Chapters.
- No raw store access exposed as tools; tools call capability-owned operations.
- No mobile process presented as the backend for Phone Agent.
- No separate orchestration logic per channel once the shared runtime exists.
- No all-or-nothing migration. Existing Chat paths move behind the contract one vertical slice at a time.
- No universal approval dialog. Risk metadata selects the smallest adequate intervention.
- No success-looking prose before an authoritative result or receipt exists.

## Trade-offs accepted

Distributed execution is more complex than a mobile registry or a server-only agent. Some runs will pause for an app/device, provider availability must be observable, and schema conformance must be tested in more than one environment. That complexity reflects the actual product boundary: iOS owns Screen Time and device state; the server owns durable cross-channel state; SMS and voice own compliance and delivery behavior.

The alternative is hidden duplication and false capability. This architecture pays the complexity once in explicit contracts.

## Stated bet

If Kwilt lets a person express an outcome in ordinary language, selects only the relevant life context, and completes or clearly stages the required capability operations under one durable trust contract, then users will treat Chat as the front door to Kwilt rather than a novelty tab—and the same runtime can support Phone Agent without becoming a separate product brain.

## Success signal

For a representative eval set spanning Plan, Activities, Goals, Chapters, Places, Screen Time, Money, Games, household, account, and general conversation:

- Kwilt chooses the correct capability or no-tool path;
- it does not ask the user to translate a clear request into app vocabulary;
- proposed and completed changes match authoritative capability state;
- cross-channel runs resume without duplicate writes or contradictory permissions;
- users can understand what happened, correct it, and reach the owning native surface.
