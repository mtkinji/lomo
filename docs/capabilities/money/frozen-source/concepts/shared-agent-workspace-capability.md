# Shared Agent Workspace Capability

## Intent

Kwilt Money should not rebuild a lightweight chat approximation. The mature Giraffed composer, timeline, run lifecycle, proposals, steering, stop controls, preferences, and AI gateway behavior should become a composable agent workspace capability that Kwilt Money can consume.

## Why not direct copy-paste

Giraffed currently lives in a Next/web surface. Kwilt Money is an Expo/React Native app. The portable unit should therefore be:

- a headless core package,
- shared persistence/API contracts,
- shared run lifecycle and event types,
- shared tool/proposal model,
- platform-specific UI renderers.

This preserves the maturity without forcing web UI assumptions into mobile.

## Capability layers

### 1. Agent workspace core

Reusable, platform-neutral TypeScript:

- `AgentThread`
- `AgentMessage`
- `AgentRun`
- `AgentRunEvent`
- `AgentProposal`
- `ProposalOperation`
- `ToolArtifact`
- `AgentPreferences`
- reducers for streaming events,
- timeline assembly,
- proposal state transitions,
- run control state,
- prompt/run request contracts.

### 2. Agent runtime/API adapter

Server-side capability:

- create user message,
- create or resume run,
- stream run events,
- append assistant checkpoints,
- create proposals and tool artifacts,
- stop run,
- steer active run,
- persist preferences,
- call AI gateway.

For Kwilt Money, this adapter should register budget tools:

- create budget,
- update budget,
- find unmatched transactions,
- suggest transaction matches,
- apply transaction correction,
- create app-control rule,
- explain monthly runway,
- summarize budget status.

### 3. UI renderer

Two renderers can share the same core contracts:

- Web renderer from Giraffed.
- Expo/React Native renderer for Kwilt Money.

The mobile renderer should preserve the Giraffed grammar:

- bottom composer,
- timeline/event hierarchy,
- activity rows,
- assistant checkpoints,
- proposal cards,
- tool/action cards,
- stop and steer controls,
- model/preferences controls when appropriate,
- inline evidence,
- explicit confirmation before mutations.

## Kwilt Money Ask tab

The Ask tab should be the mobile agent workspace. It should not be a static shell.

The first local slice can use fixture events, but the build plan should treat that as a temporary adapter while the shared capability is extracted.

User examples:

- "Create a $100 shopping budget."
- "Why is Shopping over?"
- "Find unmatched Amazon transactions."
- "Move these Target transactions to Kids."
- "Pause Amazon when Shopping is maxed out."

Agent outputs should be actionable proposals:

- budget creation proposal,
- transaction-match proposal,
- matching-rule proposal,
- app-control proposal,
- explanation with evidence.

## Persistence model

Kwilt Money should reuse the agent persistence pattern, adapted to this app's account/project scope:

- `agent_threads`
- `agent_messages`
- `agent_runs`
- `agent_run_events`
- `agent_proposals`
- `proposal_operations`
- `tool_artifacts`
- profile-level agent preferences

If shared tables are not feasible initially, mirror the schema in the Kwilt Money backend and keep the TypeScript contracts aligned.

## Extraction strategy

1. Identify Giraffed's stable contracts in `orchard-repository.ts`, `orchard-workbench.tsx`, `/api/agent/run`, steer/stop routes, and AI gateway.
2. Extract platform-neutral types, reducers, and stream client into a shared package.
3. Keep Giraffed web renderer consuming the package.
4. Build Kwilt Money mobile renderer against the same package.
5. Register Kwilt Money tools and proposal operation types.
6. Add persistence migrations for Kwilt Money agent tables or shared agent tables.
7. Replace the fixture Ask tab with the real workspace.

## V1 boundary

Do not block the whole budget prototype on the extraction. Build the Budget and Transactions tabs locally first, but treat the Ask tab as an integration milestone:

- V1 local: fixture timeline shaped like the shared contracts.
- V1.5: shared core package and mobile renderer.
- V2: live AI gateway, persisted runs, proposals, and budget tools.
