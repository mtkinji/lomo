# Kwilt AI Chat architecture

Status: current product architecture as of 2026-07-24. The fixed-mode bottom-sheet design described in earlier versions of this document is a legacy contextual-workflow architecture, not the architecture of standalone Unified Chat.

## Architectural intent

Kwilt Chat is a durable conversational channel into Kwilt and a competent general-purpose assistant. It is not the owner of capability truth. The mobile app hosts a standalone Chat destination and loads a credential-free shared workbench; authenticated native code owns user identity, persistence, private context, capability providers, mutations, and bridge authorization.

The long-term coordinator is channel-independent. Mobile Chat, Phone Agent, and future channels use the same logical thread, message, run, evidence, proposal, operation, receipt, and pending-client-action records. A channel may expose different provider availability, but it must not redefine the meaning or safety policy of an operation.

## Product behavior layer

Each turn resolves to one product behavior before tools are executed:

- **Kwilt-native** — bounded capability evidence, capability-owned judgment, and proportionate action.
- **Context-enhanced** — minimum relevant Kwilt context for a broader answer, with visible scope.
- **General-purpose** — a direct useful answer without unnecessary private retrieval or forced Kwilt workflow.
- **Current-information** — reliable current sources with citations when freshness or verification matters.
- **Bounded** — exact limits plus the safest useful assistance available.

These are outcomes, not user-selectable modes. Internal request classes and routes may support planning, but the person should not need to choose a mode or capability before asking.

## Runtime boundaries

### Native host

The React Native host owns:

- authenticated repository access and durable thread hydration;
- request classification, capability discovery, policy, and provider invocation;
- explicit and retrieved private-context authorization;
- native voice, attachment selection, haptics, sharing, notifications, deep links, and OS authorization;
- capability-owned proposal review, apply, recovery, undo, and exact native return;
- a narrow versioned bridge to the workbench.

No long-lived product credential is exposed to workbench JavaScript. Unknown commands, stale request identifiers, incompatible protocol versions, and duplicate mutations must fail safely.

### Shared workbench

The workbench owns presentation and interaction for the durable conversation:

- causal turn rendering;
- composer, context tray, stop, retry, steer, and feedback affordances;
- human-readable answer, evidence, proposal, receipt, and recovery surfaces;
- bridge requests for native-owned behavior.

The canonical v2 snapshot timeline is the presentation source of truth. Renderers must preserve causal order:

`request → Working → answer → evidence → proposal → receipt`

Artifact buckets may remain compatibility payloads, but must not be used to reconstruct chronology. Updating or undoing an old proposal changes its original artifact; a later compact correction is added only when the newer state would otherwise be unclear.

### Durable coordinator

The coordinator follows the target pipeline:

`persist → plan → authorize context → execute → materialize outcome → finalize`

`runUnifiedChatTurn` coordinates that pipeline through focused phase modules:

- `turnPersistencePhase` hydrates the durable aggregate, validates retries and attachments, inserts the user message idempotently, and handles typed pending-work cancellation.
- `turnPlanningPhase` combines deterministic and semantic routing into one request policy and resolves typed follow-up referents.
- `turnContextPhase` authorizes capability snapshots, selects bounded evidence, and persists visible scope plus evidence records.
- `turnExecutionPhase` owns discovered tools, provider execution, prompt grounding, title maintenance, and validated visible model output.
- `turnOutcomePhase` materializes assistant messages, proposals, client actions, tool events, and conversation referents. Completion-looking action prose without an authoritative proposal or handoff is rejected before it becomes a visible assistant message.
- `turnFinalizationPhase` performs the final legal run transition and records stop, steer, typed failure, and recoverable completion-write failure states.

Every phase preserves causal message/run IDs, optimistic versions, idempotency keys, typed failure codes, and recoverable run state. Persistence failure is reported before a run exists; planning failure creates a durable failed run linked to the saved user message; later phase failures transition the active run without exposing provider or database error details.

The durable record contract is:

- `AgentThread` — conversation scope and continuity.
- `AgentMessage` — durable user and visible assistant content.
- `AgentRun` and `AgentRunEvent` — one attempt and its ordered execution history.
- `EvidenceRef` — material sources with authority, freshness, scope, and sufficiency.
- `AgentProposal` and operations — reviewable candidate changes.
- `MutationReceipt` — authoritative applied result, return target, and correction or undo state.
- pending client action — work requiring an authenticated device or native surface.

Rendered UI is a projection of these records, never the sole source of truth.

## Capability ownership

Every user-meaningful operation belongs to one capability. The capability owns:

- data and retrieval semantics;
- ranking, eligibility, and domain judgment;
- input and output schema;
- consequence level, reversibility, and confirmation policy;
- provider eligibility and channel availability;
- mutation, receipt, recovery, undo, and native return behavior.

Chat discovers and invokes that contract. It does not reproduce a second AI-shaped implementation of Goals, Activities, Plan, Chapters, Profile, relationships, Account, Money, Games, Screen Time, or future capabilities.

Low-risk reversible capture may apply directly when the user's request itself supplies authorization. Updates and consequential changes require proportionate review. OS, audience, sharing, payment, provider, and device-control authorization stays in the owning native surface. Missing providers return an unavailable or pending-client-action outcome rather than completion-looking prose.

The canonical operation manifest now lives in `packages/kwilt-agent-runtime/src/kwiltCapabilityManifest.ts`. It defines each user-meaningful operation once with its owner, purpose, resolved schemas, effect, consequence, reversibility, confirmation policy, provider eligibility, mobile and Phone availability, expected outcome, proof paths, source references, and return behavior. Shared versioned tool schemas live beside it in `kwiltToolContracts.ts`.

Product inventory, mobile tool discovery, the Supabase server catalog, and conversational coverage are projections of that manifest. Mobile and server provider modules declare which tool ids and providers they implement; they do not copy schemas or operation safety policy. Phone execution, device-handoff, mobile-proposal, pending-provider, and excluded states are materialized from the same manifest rather than maintained as a second channel registry. A missing implementation is absent from the runtime catalog, while an eligible but unavailable provider still resolves through the shared unavailable or pending-client-action policy.

## Context and privacy

Private context is detached by default. A run may use only:

- context the person explicitly attached or entered from;
- capability data authorized by the route and owning policy;
- the minimum evidence necessary to improve the answer or perform the requested operation.

Visible scope must identify material private context. Conversation retention is not standing permission to attach old objects to unrelated questions. Ordinary general questions use no private Kwilt context unless the person asks for it or the answer materially depends on it and the scope is authorized and visible.

## Action truth

Model prose is never proof of an effect. A proposal is not an applied result. A staged Phone operation is not a native completion. A provider request is not a verified provider effect.

Every real effect requires authoritative capability evidence, normally a mutation receipt tied to the proposal operation and idempotency key. Native or external effects are independently verified at the owning boundary. Failures leave a durable, honest, recoverable state.

## Current-information and specialist boundaries

General assistance may use the base model. Requests whose answer depends on current facts, verification, recommendations, or unfamiliar claims require approved web search and compact inspectable citations. Until that provider exists in the supported runtime, Chat must state the freshness boundary.

Medical, legal, financial, safety, and other consequential requests receive bounded assistance. Kwilt may explain, organize questions, or help the person prepare, but must not invent specialist authority or imply an unsupported action occurred.

## Legacy contextual workflows

`AgentWorkspace`, `AiChatPane`, `ChatMode`, workflow definitions, Arc creation, onboarding, and related bottom sheets remain real implementation surfaces for bounded contextual jobs. They may continue to own those flows until deliberately migrated.

They are not the standalone Chat architecture and must not impose these former constraints on Unified Chat:

- one fixed mode for the lifetime of a conversation;
- persistence only inside one workflow instance;
- no global durable thread list;
- all AI entry through a bottom sheet;
- a mode-local tool registry as the final operation source of truth.

Legacy workflows should reuse shared voice, capability contracts, and safe mutation paths where possible. They must not become an alternative durable agent runtime.

## Proof classes

Evidence is recorded separately for:

- automated tests and static contracts;
- signed simulator behavior;
- signed physical-device behavior;
- TestFlight build acceptance, processing, and installation;
- hosted workbench source and deployed SHA;
- database migration state;
- Edge Function and worker deployment state;
- real provider effects;
- Phone-to-mobile cross-channel continuity.

Success in one class cannot be used as proof for another. The current boundary is maintained in `docs/delivery-evidence/unified-chat/`.
