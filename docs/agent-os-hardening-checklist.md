## Agent OS Hardening Checklist

This document tracks the remaining work to fully realize the "AgentWorkspace as mini OS, workflows as apps" strategy.

Each item is written so a future Cursor agent (or human) can pick it up independently.

Use the checkboxes below to track progress. When a task is completed, change `[ ]` to `[x]`.

---

## Top-level checklist

- [ ] **1. Arc Creation workflow presenter**
- [ ] **2. Goal Creation workflow**
- [ ] **3. Chat timeline controller API formalization**
- [ ] **4. Inline edit workflows via useAgentLauncher**
- [ ] **5. Tools / syscalls mutation boundary**
- [ ] **6. Documentation alignment and guardrails**
- [ ] **7. WorkflowSpec as the single authoring surface**

You can also mark individual subtasks in each section below.

## 1. Arc Creation: Move from "prompt-only" to a real workflow presenter

**Goal**: Make Arc creation from the Arcs list a first-class workflow (like FTUE), with multi-step cards and a visible thread, instead of a single conversational blob.

### Current state

- `AgentWorkspace` supports workflows via `workflowDefinitionId` and `WorkflowRuntimeContext`.
- `ARC_CREATION_WORKFLOW` exists in `domain/workflows.ts` and is now wired into `NewArcModal` via:
  - `mode="arcCreation"`
  - `workflowDefinitionId={ARC_CREATION_WORKFLOW_ID}`
  - `launchContext={{ source: 'arcsScreenNewArc', intent: 'arcCreation' }}`
  - `workspaceSnapshot={buildArcCoachLaunchContext(arcs, goals)}`
- However, `AgentWorkspace` only renders a `stepCard` for workflows whose `chatMode === 'firstTimeOnboarding'` (FTUE presenters). Arc creation currently has **no dedicated presenter**.

### Work items

- [ ] **1.1 Add an ArcCreationFlow presenter component**
  - Location suggestion: `src/features/arcs/ArcCreationFlow.tsx`.
  - Responsibilities:
    - Accept `chatControllerRef: React.RefObject<AiChatPaneController | null>` and `onComplete` / workflow hooks (via `useWorkflowRuntime`).
    - Render a sequence of step cards (e.g., context prompt, hunger for change, time horizon, constraints, Arc proposal/selection).
    - Use `chatControllerRef.current?.appendUserMessage` / `appendAssistantMessage` to mirror card submissions into the timeline.
    - Call `completeStep` on the appropriate workflow step IDs defined in `ARC_CREATION_WORKFLOW`.

- [ ] **1.2 Wire ArcCreationFlow into AgentWorkspace.workflowStepCard**
  - In `src/features/ai/AgentWorkspace.tsx`, extend `workflowStepCard` logic:
    - When `workflowDefinition?.chatMode === 'arcCreation'`, render `<ArcCreationFlow ... />` as the `stepCard` instead of leaving it undefined.
    - Ensure `onComplete` from ArcCreationFlow ultimately calls the `onConfirmArc` prop so host screens continue to persist + navigate correctly.

- [ ] **1.3 Align workflow steps with UI**
  - Update `ARC_CREATION_WORKFLOW` steps in `domain/workflows.ts` or move to a dedicated spec file (e.g., `domain/workflowSpecs/arcCreationSpec.ts`) so they:
    - Map 1:1 to ArcCreationFlow screens/cards (context_collect → agent_generate_arc → confirm_arc).
    - Include any `ui` metadata needed for future renderer-driven cards.

### Acceptance criteria

- New Arc AI tab (from Arcs list) shows:
  - A clearly multi-step experience (not just one assistant blob): user answers and prompts appear as bubbles; cards are stacked in the same scrollable thread.
- `ARC_CREATION_WORKFLOW` is the single source of truth for step ordering and outcome shape.
- `onConfirmArc` is still invoked as today, and navigation + `ensureArcDevelopmentInsights` still behave exactly as before.

---

## 2. Goal Creation: Introduce a workflow-backed Goal coach

**Goal**: Give Goals AI the same workflow + StepCard structure as FTUE and Arc creation, so all "object creation" flows share the same control plane.

### Current state

- `ChatMode` already includes `goalCreation` with a dedicated `GOAL_CREATION_SYSTEM_PROMPT` in `src/features/ai/chatRegistry.ts`.
- The Goals screen (`src/features/goals/GoalsScreen.tsx`) hosts an `AgentWorkspace` inside its goal coach drawer:
  - `mode="goalCreation"`
  - `launchContext` built from the current Arc (or standalone context).
  - `workspaceSnapshot` summarizing existing Arcs/Goals.
- There is **no Goal creation `WorkflowDefinition`** yet; goal creation is purely system-prompt-driven.

### Work items

- [x] **2.1 Define a Goal Creation workflow**
  - Add a new `GOAL_CREATION_WORKFLOW_ID` and `WorkflowDefinition` in `domain/workflows.ts` or a new spec in `domain/workflowSpecs/goalCreationSpec.ts`.
  - Suggested steps:
    - `context_collect`: collect high-level desire + rough time horizon.
    - `agent_generate_goals`: generate 1–3 candidate goals using the existing system prompt.
    - `confirm_goal`: help the user pick/refine one goal and capture the final title/description/force intent.
  - Include `outcomeSchema` to describe the final goal draft structure (aligned with `GoalDraft`).

- [ ] **2.2 Create a GoalCreationFlow presenter**
  - Location suggestion: `src/features/goals/GoalCreationFlow.tsx`.
  - Responsibilities:
    - Similar to `ArcCreationFlow`: attach to `WorkflowRuntimeContext` and `AiChatPaneController`.
    - Render step cards: intro/context, options list, confirm/refine selected goal.
    - Emit a structured outcome (`GoalDraft`) when complete.

- [x] **2.3 Wire workflow into GoalsScreen**
  - Update the Goals AI drawer to pass `workflowDefinitionId={GOAL_CREATION_WORKFLOW_ID}` into `AgentWorkspace` when `activeTab === 'ai'`.
  - Ensure existing manual flow and any legacy `GoalWizard` continue to work as-is on the Manual tab.

### Acceptance criteria

- Goals AI experience runs under a concrete `WorkflowDefinition` instead of being prompt-only.
- A future agent can inspect `WORKFLOW_DEFINITIONS` to see **all** creation flows (Arc, Goal, Activity) in one place, with consistent step naming and outcome schemas.

---

## 3. Formalize the Chat Timeline Controller API

**Goal**: Turn the emergent `AiChatPaneController` pattern into an explicit, documented API that all workflow presenters use.

### Current state

- `AiChatPaneController` is defined in `src/features/ai/AiChatScreen.tsx` and already used by:
  - `IdentityAspirationFlow` (`src/features/onboarding/IdentityAspirationFlow.tsx`).
  - `OnboardingGuidedFlow` (`src/features/onboarding/OnboardingGuidedFlow.tsx`).
- The controller exposes methods like `appendSystemMessage`, `appendUserMessage`, `appendAssistantMessage`, and card insertion helpers (see type definition for the authoritative list).
- There is no small, separate `ChatTimelineController` interface that’s documented as the **contract for all presenters/workflows**.

### Work items

- [x] **3.1 Extract a minimal controller interface type**
  - Define a new exported type in `AiChatScreen.tsx` or a small `chatTimelineTypes.ts` file, e.g.:
    - `export type ChatTimelineController = Pick<AiChatPaneController, 'appendUserMessage' | 'appendAssistantMessage' | 'appendSystemMessage' | 'insertCard' | 'setComposerState'>;`
  - Document each method with a short comment focused on workflows/presenters.

- [x] **3.2 Update presenters to depend on the abstract type**
  - Update `IdentityAspirationFlow`, `OnboardingGuidedFlow`, and future presenters (ArcCreationFlow, GoalCreationFlow) to type their `chatControllerRef` props against `ChatTimelineController` (or the alias) instead of the full internal controller type where appropriate.

- [x] **3.3 Add short design notes to docs**
  - In `docs/ai-chat-architecture.md` or a new section within it, briefly describe the `ChatTimelineController` and its role as:
    - The only way workflows can write to the thread or manipulate the composer.

### Acceptance criteria

- Any new workflow presenter (FTUE-like components) can be built by importing a single, documented controller type.
- `AiChatPane` remains the only implementation of the controller, but the rest of the code treats it as an abstract contract.

---

## 4. Inline Edit Flows: Optional structured workflows

**Goal**: Allow high-value inline edit experiences (e.g., editing Arc narratives, Goal descriptions) to opt into lightweight workflows instead of generic free-form chat.

### Current state

- `useAgentLauncher` (`src/features/ai/useAgentLauncher.tsx`) provides:
  - `openForScreenContext` and `openForFieldContext` helpers.
  - A shared `BottomDrawer` that always hosts `AgentWorkspace`.
- For both screen/field contexts, we currently:
  - Pass `mode: undefined` (free coach).
  - Do **not** attach a `workflowDefinitionId`.

### Work items

- [ ] **4.1 Extend useAgentLauncher to accept optional mode/workflow overrides**
  - Add optional parameters or a configuration object allowing callers to specify:
    - `mode?: ChatMode`.
    - `workflowDefinitionId?: string`.
  - Maintain backwards compatibility by defaulting to the current free-form behavior when not provided.

- [ ] **4.2 Define at least one small edit workflow**
  - Example: `ARC_NARRATIVE_EDIT_WORKFLOW_ID`:
    - Steps: `context_collect` → `agent_generate_edit` → `confirm_edit`.
    - Outcome: a single updated string for the field.
  - Implement a thin `ArcNarrativeEditFlow` presenter that drives the cards and writes the final result to the store via host callbacks.

- [ ] **4.3 Wire one concrete field to this workflow as a pilot**
  - Pick a high-ROI field (e.g., Arc narrative in `ArcDetailScreen.tsx`).
  - Use the extended `useAgentLauncher` to open AgentWorkspace with the edit workflow attached for that field.

### Acceptance criteria

- At least one inline edit experience runs through a structured workflow.
- `useAgentLauncher` remains the central utility for bringing up AgentWorkspace from detail screens, but is now capable of both free-form and structured flows.

---

## 5. Tools / Syscalls: Tighten the mutation boundary

**Goal**: Move toward the design where **all AI-driven domain mutations** (Arcs, Goals, Activities, Profile) conceptually go through tools (the "syscall" layer), even if the implementation remains client-side for now.

### Current state

- `CHAT_MODE_REGISTRY` in `src/features/ai/chatRegistry.ts` defines tools (e.g., `generateArcs`, `adoptArc`) with descriptions and kinds.
- `services/ai.ts` implements raw OpenAI calls (`generateArcs`, `generateGoals`, `sendCoachChat`).
- Many domain mutations are currently wired via host callbacks (e.g., `onConfirmArc`, `onAdoptActivitySuggestion`, `onComplete` returning `adoptedActivityTitles`). This is clean, but slightly below the "tools as syscalls" abstraction.

### Work items

- [ ] **5.1 Document the current JSON handoff patterns as proto-tools**
  - In `docs/ai-chat-architecture.md` or a new short doc, explicitly describe patterns like:
    - `ARC_PROPOSAL_JSON:` blocks for Arc proposals.
    - `ACTIVITY_SUGGESTIONS_JSON:` blocks for Activity suggestions.
  - Clarify that for now, these serve as the "tool output" contract between the LLM and the host app.

- [ ] **5.2 Ensure all new workflows use these contracts**
  - ArcCreationFlow should adopt Arcs via the existing `ARC_PROPOSAL_JSON` pattern.
  - GoalCreationFlow should adopt `GoalDraft`s via a similar single-line JSON block.

- [ ] **5.3 Optional future step: centralized tool executor**
  - When ready, introduce a small client-side (or server-side) dispatcher that:
    - Reads tool-like JSON outputs.
    - Executes the corresponding state updates (Arc/Goal/Activity/Profile changes).
    - Logs tool invocations for debugging.
  - This can be deferred until after the main workflow work is complete.

### Acceptance criteria

- All structured creation workflows have a clearly documented JSON contract for how the LLM hands proposals back.
- Adding a new domain tool in the future is a matter of:
  - Updating `CHAT_MODE_REGISTRY`.
  - Implementing a handler.
  - Wiring the workflow to emit the right JSON block.

---

## 6. Documentation alignment and guardrails

**Goal**: Make it trivial for future contributors or agents to understand and extend the Agent OS without accidentally bypassing it.

### Current state

- Key docs already exist:
  - `docs/ai-chat-architecture.md`.
  - `docs/agent-onboarding-flow.md`.
  - `docs/editable-fields-and-agent-workflows.md`.
- These docs describe the target architecture well but predate some recent wiring changes (e.g., Arc creation using AgentWorkspace, new launch source `arcsScreenNewArc`).

### Work items

- [ ] **6.1 Update ai-chat-architecture.md to reflect current implementation**
  - Note that:
    - FTUE, Arc creation, Activities AI, Goals AI, and freeform coach now all host `AgentWorkspace`.
    - New Arc AI specifically uses `ARC_CREATION_WORKFLOW_ID` and `buildArcCoachLaunchContext`.

- [ ] **6.2 Add a short "AI OS interaction contract" section**
  - Summarize the required inputs for any new AI experience:
    - `mode: ChatMode`.
    - `launchContext: LaunchContext`.
    - Optional `workflowDefinitionId` and `workspaceSnapshot`.
  - Emphasize that all new AI surfaces must:
    - Host `AgentWorkspace` / `AiChatPane` (no bespoke chat surfaces).
    - Use the shared timeline primitive and controller.

- [ ] **6.3 Add cross-links to this checklist**
  - Link `docs/agent-os-hardening-checklist.md` from the other AI docs so it’s discoverable.

### Acceptance criteria

- Any engineer (or Cursor agent) can open this checklist + `ai-chat-architecture.md` and immediately see:
  - The current state.
  - The design intent.
  - A clear set of next tasks that preserve the architecture.

---

## How to use this checklist with Cursor agents

- When you spin up a new Cursor session, you can:
  - Point the agent at this file and the relevant code paths (files listed in each section).
  - Ask it to tackle a **single numbered section** end-to-end (e.g., "Implement item 1.1–1.3"), or a single bullet if you want smaller PRs.
- As items are completed, update this checklist (or mark them in your own task system) so future work stays focused and consistent with the Agent OS strategy.

---

## 7. WorkflowSpec as the single authoring surface

**Goal**: Ensure that building or updating any AI workflow (e.g., Chapter creation) means **authoring a single spec file**, with the runtime strictly enforcing what can appear in the thread (bubbles vs cards) and how the flow progresses.

### Current state

- The FTUE v2 flow already uses a high-level spec (`domain/workflowSpecs/firstTimeOnboardingV2Spec.ts`) compiled into a `WorkflowDefinition`.
- `WorkflowDefinition` supports:
  - `chatMode`, `steps`, `outcomeSchema`.
  - Per-step metadata like `renderMode`, `ui`, and `hideFreeformChatInput`.
- However:
  - Not all workflows use a spec file yet (Arc/Goal creation and future Chapter creation still need theirs).
  - The spec types **do not yet fully encode** strict rules for:
    - What is rendered as assistant text vs as cards.
    - Which card component is allowed at a step.
    - Whether arbitrary free-form user input is permitted.

### Work items

- [ ] **7.1 Define a canonical WorkflowSpec type for all flows**
  - Extend or generalize the existing FTUE spec pattern into a reusable type, e.g. `WorkflowSpec` and `StepSpec` in a shared module (`domain/workflowSpecs/types.ts`).
  - For each step, require explicit declarations for:
    - `layoutKind`: e.g. `'assistant_text' | 'card_only' | 'card_plus_text'`.
    - `cardComponentId?: AgentComponentId`: which card type is allowed (e.g., `ChapterIntroCard`, `GoalOptionsCard`).
    - `allowFreeformChat?: boolean`: whether the freeform composer accepts input at this step.
  - Ensure there is **no escape hatch** in the spec for arbitrary React components—only component IDs and structured props.

- [ ] **7.2 Make the compiler the only way to create WorkflowDefinitions**
  - Introduce a shared compiler (patterned after FTUE) that turns any `WorkflowSpec` into a `WorkflowDefinition`:
    - Enforces the per-step layout rules above.
    - Fills in `hideFreeformChatInput` and `ui` metadata consistently.
  - Require new workflows (Arc, Goal, Chapter, Activity variations) to be added via:
    - `workflowSpecs/...Spec.ts` + a compile function in `domain/workflows.ts`.

- [ ] **7.3 Have AgentWorkspace / presenters enforce the spec at runtime**
  - Update `AgentWorkspace` and any workflow presenters so that:
    - Assistant text is only rendered when the spec says `layoutKind` includes text.
    - Cards are only rendered via `cardComponentId` from the spec and the shared `AgentComponentId` catalog.
    - Freeform chat input is enabled/disabled strictly based on `allowFreeformChat` (and/or `hideFreeformChatInput`).
  - Prevent presenters from directly choosing arbitrary UI; they should rely on:
    - `WorkflowRuntimeContext` state.
    - The shared `ChatTimelineController` methods.

- [ ] **7.4 Add authoring guidelines for new workflows**
  - In `docs/ai-chat-architecture.md` or a small new doc, write a short “How to add a new workflow (e.g., Chapter creation)” section:
    - Step 1: Create `workflowSpecs/chapterCreationSpec.ts` with steps + layoutKind + cardComponentId.
    - Step 2: Wire it into `domain/workflows.ts` via the compiler and register an ID.
    - Step 3: Mount `AgentWorkspace` from a screen with `{ mode, workflowDefinitionId, launchContext }`.
  - Clearly state that **workflow specs are not allowed** to:
    - Call `sendCoachChat` directly.
    - Mount bespoke chat UIs or screens outside `AgentWorkspace` / `AiChatPane`.

### Acceptance criteria

- For any new AI workflow (Arc, Goal, Chapter, etc.), the only file that needs authoring is a `WorkflowSpec` plus minimal host wiring (launching AgentWorkspace with the right IDs).
- The runtime (AgentWorkspace + AiChatPane + presenters) **strictly enforces**:
  - Which steps can show assistant text.
  - Which card components may appear.
  - Whether freeform chat input is available at a given step.
- Workflow authors cannot introduce bespoke UIs or ad-hoc chat behavior; they work entirely within the declared primitives.

---
