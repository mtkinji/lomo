## kwilt AI Chat Architecture

### Overview

kwilt’s AI experiences are built around a **contextual helper** that lives in a bottom sheet, layered on top of the existing app shell and page canvas. Instead of a single generic chatbot, we treat each AI entry point as doing a specific job (a **mode**) with a well-defined set of **tools** it is allowed to call.

- **Surface**: `KwiltBottomSheet` hosting a chat-like interaction.
- **Mode**: describes the job (e.g. `arcCreation`).
- **Context**: structured data passed at launch (arcs, goals, activities, etc.).
- **Tool registry**: defines what the AI can do in that mode and where those tools live.

This keeps the UX tight and coaching-oriented while giving us a clean path to richer capabilities (e.g. scheduling Activities on a real calendar) over time.

### Core concepts

#### Chat modes

Modes answer the question: **“What is kwilt helping with right now?”**  
Each mode has:

- a **stable identifier** (e.g. `'arcCreation'`),
- a **human label** (e.g. `"Arc Coach"`),
- and a list of **allowed tools**.

Today we have:

- `arcCreation`: an **Arc Coach** that helps the user draft new Arcs.

All Arc-creation modes (including FTUE identity onboarding) should treat `docs/arc-aspiration-ftue.md` as the **gold-standard spec** for what a good Arc looks like (domain of becoming, motivational style, signature trait, growth edge, everyday proud moment) and how `Arc.name` and `Arc.narrative` are synthesized from minimal input.

Future examples:

- `goalDesign`: help translate an Arc into concrete Goals.
- `goalActivities`: help design and schedule Activities for a goal.
- `weeklyPlanning`: help shape a weekly plan across Arcs/goals.

#### Tool registry

Tools are the **capabilities** the AI can use in a given mode. They are defined in `src/features/ai/chatRegistry.ts` and intentionally abstracted from the current implementation details so we can move them behind a server and/or 3rd parties later.

Key fields on a tool:

- `id`: logical name, e.g. `generateArcs`, `scheduleActivitiesOnCalendar`.
- `description`: human-readable explanation (used in prompts and docs).
- `kind`:
  - `internal_ai`: uses an AI model (e.g. OpenAI) to generate suggestions.
  - `internal_store`: reads or writes kwilt’s own data (arcs, goals, activities).
  - `external_integration`: calls 3rd-party services (e.g. calendar).
- `requiresAuth`: whether the tool depends on the user having connected a 3rd-party account.
- `serverOperation`: logical server-side operation or endpoint name, so a future agent/orchestrator can map tools to real capabilities.

Example (simplified) from `CHAT_MODE_REGISTRY`:

- Mode: `arcCreation` (Arc Coach)
  - Tool `generateArcs` (internal AI)
  - Tool `adoptArc` (internal store)

Planned tool IDs already sketched into the registry include:

- `listActivitiesForGoal`
- `suggestScheduleForActivities`
- `scheduleActivitiesOnCalendar`

These are not yet implemented, but the registry reserves their shape so that UI and agent code can be written against stable tool identities.

### Toolable app surface & user profile tools

Over time we want **everything the user can do in the app** (at least everything that touches domain data) to be **expressible as a tool** the coach can call on their behalf.

- **Design principle**
  - Every user-facing capability should have a clear, documented tool:
    - **Good**: `setUserProfile`, `setUserAgeRange`, `createArcFromSuggestion`, `updateGoalStatus`.
    - **Risky**: low-level primitives like “arbitrary SQL” or “raw AsyncStorage writes”.
  - Tools should be **domain-level** (Arcs, Goals, Activities, Profile), not implementation-level.
  - The tool registry is the single source of truth for:
    - what the coach is *allowed* to do in a mode,
    - and where those capabilities live (client vs server vs third party).

- **Profile as a first tool surface**
  - The `UserProfile` (age range, communication preferences, visual style, accessibility, consent) is the first domain object exposed to the coach via tools.
  - The coach should be able to:
    - **Read** profile fields (e.g., age range, tone preference) to adapt its responses.
    - **Propose updates** (e.g., “set your age range to 35–44 based on what you told me”) via explicit tools rather than hidden state changes.
  - Client UI can still set profile fields directly (e.g., an age range picker), but any state that matters for coaching should also be reachable through tools so future agents/orchestrators can act without bespoke wiring.

In practice this means that as we implement new features (Arc creation, Goal design, scheduling, Chapters, settings), we **start by designing the tools** for that capability, then wire both the chat experience and the rest of the app against those tools.

#### Context at launch

When a chat helper opens, the screen passes **context** describing the part of the workspace the user is working in. That context is combined with user answers in the conversation and fed into AI tools.

For example, the Arcs screen passes a snapshot built from:

- existing **Arcs** (count + a few names),
- total **Goals**,
- total **Activities**.

That snapshot is appended into `additionalContext` for `generateArcs`, alongside any user-provided constraints, so the Arc Coach sees the user’s current arcs workspace instead of operating in a vacuum.

### Current implementation: Arc Coach (`arcCreation`)

The first production use of this architecture is the **Arc Coach** launched from the `+` button on the Arcs list.

- Screen: `ArcsScreen`
  - Uses `NewArcModal` (a conversational bottom sheet) as the UI surface.
  - When the user taps `+`, this sheet opens.
- Mode: `arcCreation`
  - Defined in `CHAT_MODE_REGISTRY.arcCreation` with label `"Arc Coach"`.
  - Allowed tools:
    - `generateArcs` (internal AI, mapped to `ai.generateArcs`).
    - `adoptArc` (internal store, mapped conceptually to `arc.createFromSuggestion`).
- Context:
  - `prompt`, `timeHorizon`, `additionalContext` collected in the conversation.
  - A workspace snapshot summarizing Arcs/goals/activities.
  - These are combined into the `GenerateArcParams` passed to `generateArcs`.

In concrete terms:

- The UI still drives the conversation and calls `generateArcs` via `src/services/ai.ts`.
- The **registry** provides a single place to:
  - name the mode (`arcCreation`),
  - describe its tools,
  - and hint at where those tools will live on the server.

### How this evolves to scheduling and 3rd-party tools

Within ~6 months we expect users to ask kwilt to **schedule Activities** and sync with the tools they already use (calendars, etc.). This architecture supports that by:

1. Treating scheduling as a **mode** (`goalActivities` or `weeklyPlanning`).
2. Adding **external integration tools** to the registry:
   - `listActivitiesForGoal` (internal_store).
   - `suggestScheduleForActivities` (internal_ai).
   - `scheduleActivitiesOnCalendar` (external_integration, requiresAuth).
3. Implementing these tools as **server-side operations** that:
   - read/write kwilt’s store,
   - call 3rd-party APIs using stored OAuth tokens,
   - and return structured results to the chat UI.

The bottom sheet UI and mode/registry shape remain consistent; only the backing implementations move from client-side helpers to server and 3rd-party services as needed.

### What this architecture is optimized for

- **Contextual coaching flows** with clear jobs (create an Arc, shape a Goal, plan Activities).
- **Safety and governance** via per-mode tool allowlists.
- **Incremental complexity**: start with internal AI tools, then add store + external tools behind stable tool IDs.
- **UX continuity**: all AI experiences live in a consistent bottom sheet layered over the existing shell + canvas.

### What it is not (yet) optimized for

- Fully autonomous, long-running agents that act without user initiation.
- Deep, cross-context orchestration spanning many screens and data types in one continuous thread.
- Complex multi-pane editing experiences that don’t fit well in a bottom sheet.

Those future needs can be met by building a server-side agent/orchestration layer that consumes the same **tool registry** and modes, while the mobile app continues to provide the conversational sheet UI and launch contexts.

### Workflows & AgentWorkspace (v2)

In addition to `ChatMode`, we now introduce **Workflows** and the shared **`AgentWorkspace`** shell:

- **LaunchContext** (in `src/domain/workflows.ts`)
  - Captures _where_ and _why_ the agent was launched.
  - Example: `{ source: 'firstTimeAppOpen', intent: 'firstTimeOnboarding' }`.
- **WorkflowDefinition**
  - Describes a deterministic, step-based flow (`steps`, `outcomeSchema`, `chatMode`).
  - Example: `FIRST_TIME_ONBOARDING_WORKFLOW` with steps like `welcome`, `profile_basics`, `notifications`, etc.
- **WorkflowInstance** (future backend-backed)
  - Tracks per-user progress through a definition (`currentStepId`, `collectedData`, `status`).
- **AgentWorkspace** (`src/features/ai/AgentWorkspace.tsx`)
  - Single, reusable host component for all agent UX.
  - Receives `mode`, `launchContext`, and optional workflow IDs and owns the chat + card timeline.

#### AgentWorkspace shell

`AgentWorkspace` is the **only host/orchestrator** for AI workflows. It is always mounted **inside the existing AppShell + page canvas layers** (never as its own full-screen shell), and it delegates all visible chat UI to `AiChatPane`:

- **App shell**: navigation + primary gutters (`AppShell`).
- **Agent shell**: `AgentWorkspace` sitting inside a screen or bottom sheet, configured with a `ChatMode`, `LaunchContext`, and optional workflow IDs.
- **Chat canvas**: `AiChatPane`, which renders the thread, cards, and composer.

Any workflow-specific visuals (identity cards, activity suggestions, etc.) should be rendered as **cards inside this canvas**, not as separate modal/screen stacks that bypass `AgentWorkspace`.

#### Timeline + cards model

The chat surface is a simple **timeline of items**, not a special “step component” system:

- **AgentTimelineItem** (conceptual type, implemented inside `AiChatPane`):
  - `assistantMessage` – model replies.
  - `userMessage` – anything the user typed or tapped that should appear in the thread.
  - `card` – rich UI blocks (forms, suggestions, previews) rendered inline with the thread.
  - `systemEvent` – internal status items (errors, loading, workflow transitions) that may or may not be visible.
- “Cards” are just **React nodes** slotted into the timeline:
  - Usually composed from `Card`, `QuestionCard`, `EditableField`, etc.
  - No dedicated `StepCard` primitive – the workflow decides _what_ to show, the timeline decides _where_ it lands.

This keeps the mental model as **“thread + cards”**: workflows talk in terms of messages and cards, and `AiChatPane` owns how they appear.

#### Workflow contract

A workflow is a small contract that says: **“given this `chatMode`, these `steps`, and this `outcomeSchema`, drive the Agent through a job inside `AgentWorkspace`.”**

- Shape (in `src/domain/workflows.ts`):
  - `id`, `label`, `version`.
  - `chatMode`: which `ChatMode` the flow runs under (e.g. `'firstTimeOnboarding'`, `'arcCreation'`).
  - `steps`: ordered list of `WorkflowStep`s, including any metadata like `hideFreeformChatInput`.
  - `outcomeSchema`: short description of the structured result the workflow produces.
- Runtime:
  - `AgentWorkspace` looks up the `WorkflowDefinition` and tracks a local `WorkflowInstance`.
  - Presenters like `IdentityAspirationFlow` plug into the flow via **`WorkflowRuntimeContext` + `AiChatPaneController`**:
    - append synthetic user messages into the timeline,
    - stream assistant replies into the same canvas,
    - insert workflow-driven cards (via the `stepCard` slot),
    - optionally hide or show the freeform composer for particular steps.

The key rule is: **workflows never reach “around” the chat** – all visible UX goes through the shared timeline, even when most of the work is tap-first cards.

#### Mode switching & persistence

`ChatMode` is **chosen at launch** and remains fixed for the lifetime of an `AgentWorkspace` instance:

- We do **not** support mid-thread `ChatMode` switching inside `AiChatPane`.
- To hand off between flows (for example, “finish identity FTUE, then open Arc creation”), we **close one `AgentWorkspace` host and open another** with a new `mode` and `LaunchContext`.

Persistence is scoped to a specific workflow instance rather than a global thread list:

- **Persisted today** (client-side only):
  - Minimal “draft” state for Arc creation inside `AiChatPane` (chat messages + input).
  - In-memory `WorkflowInstance` metadata while the app is running.
- **Planned**:
  - Store `WorkflowInstance` records and their timelines server-side.
  - Allow a host screen to **resume a specific workflow instance** by ID, restoring:
    - the workflow metadata (`currentStepId`, `collectedData`, `status`),
    - the associated chat timeline for that flow.

Even with persistence, we do **not** expose a global “AI thread inbox” in the UX. Hosts (Arcs, Goals, Activities, onboarding) remain the primary entry points; they simply gain the ability to re-open a focused workflow where the user left off.

#### Adding a new workflow (current pattern)

For now, all workflow definitions live in `src/domain/workflows.ts` behind a small registry:

1. **Define the workflow**
   - Add a new `WorkflowDefinition` constant:
     - `id`: e.g. `arc_creation_v1`.
     - `label`: human-readable name.
     - `version`: integer.
     - `chatMode`: one of the existing `ChatMode` values.
     - `outcomeSchema`: brief description of the final object shape.
     - `steps`: ordered list of `WorkflowStep`s (`id`, `type`, `fieldsCollected`, `nextStepId`, etc.).
2. **Register it**
   - Add it to `WORKFLOW_DEFINITIONS` in the same file:
     - `WORKFLOW_DEFINITIONS[ARC_CREATION_WORKFLOW_ID] = ARC_CREATION_WORKFLOW`.
3. **Wire it into AgentWorkspace**
   - Wherever you mount the agent, pass:
     - `mode`: matching `ChatMode` (e.g. `'arcCreation'`).
     - `launchContext`: describing the launch source and intent.
     - `workflowDefinitionId`: your new workflow ID.
4. **(Optional) Drive UI off the workflow**
   - Inside `AgentWorkspace`, use the workflow’s `steps` to:
     - Decide which conversational turn to ask the model for.
     - Render step-specific form cards under the assistant’s text.
     - Show user confirmations as chat bubbles and advance `currentStepId`.

As workflows grow, we can split definitions into separate files (e.g. `workflows/firstTimeOnboarding.ts`) and re-export them from `src/domain/workflows.ts`, but the registry remains the single entry point for the app and AgentWorkspace.


