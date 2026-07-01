## Agent Window Component System & FTUE

### Purpose
- Capture how the chat-based Agent surface orchestrates declarative components while keeping LOMO’s app shell + canvas hierarchy intact.
- Provide a reference FTUE that engineering, design, and prompt authors can point to when wiring the onboarding experience.
- Describe the **system design** for the shared Agent surface in a way that matches the current implementation (`AgentWorkspace`, workflows, and the agent component catalog).
- Point to the **gold-standard FTUX spec** in `docs/arc-aspiration-ftue.md` and `docs/feature-briefs/ftux-goal-arc-onboarding.md` for what onboarding should ultimately produce: a high-quality identity Arc plus a linked first Goal.

### Agent Window as a Component-Orchestrated Surface
- **Placement**: lives inside the canvas, under the persistent app shell (nav + contextual chrome). Never replaces the shell; instead, it occupies the canvas area that the user lands on after the splash.
- **Structured surface (system design)**:
  - The **host app** owns a workflow (`WorkflowDefinition` + `WorkflowInstance`) and passes it to `AgentWorkspace`, which in turn hosts the shared `AiChatPane`.
  - Each workflow step can render a **step card** (e.g., onboarding forms) inside the canvas beneath the transcript.
  - In the long run, the Agent will emit JSON that the UI renders as composable blocks sitting inline with conversational text. The **component catalog** in `src/domain/agentComponents.ts` defines the stable IDs for those blocks.
- **Design principles**
  - Declarative: Agent specifies `componentId`, `props`, and optional bindings; UI handles rendering.
  - Actionable: every component maps to a backend endpoint or agent-defined function (tool).
  - Composable: multiple components can share a message bubble when they represent one cohesive step.
  - State-aware: the Agent can query completion state before deciding to render (avoid asking twice).

### Component Catalog (V1 scope)
The **component catalog** is represented in code by `AGENT_COMPONENT_CATALOG` in `src/domain/agentComponents.ts`. It names the building blocks the Agent can reference; presenters decide how to render them.

- **FormField** (`FormField`, kind = `formField`)
  - Intent: collect a single structured input (`text`, `number`, `date`, `image`, `select`, `multi-select`, `toggle`) and send it to a clear endpoint.
  - Example bindings: `/user/name`, `/user/age`, `/user/profileImage`, `/user/preferences/focusAreas`.
- **ActionButton** (`ActionButton`, kind = `actionButton`)
  - Intent: fire a focused action such as enabling notifications or generating a starter Arc from preferences.
  - Example bindings: `/settings/notifications`, `/arc/generateFromPreferences`, `/arc/createEmpty`.
- **InstructionCard** (`InstructionCard`, kind = `instructionCard`)
  - Intent: show short, static orientation copy that sits inline with the conversation to set expectations.
- **ProgressIndicator** (`ProgressIndicator`, kind = `progressIndicator`)
  - Intent: mirror workflow progress (`currentStep` / `totalSteps`) so the Agent and UI can reinforce momentum.
- **InlineCapability** (`InlineCapability`, kind = `inlineCapability`)
  - Intent: provide lightweight inline action clusters such as `[Enable] [Skip]`, still backed by ActionButton-style endpoints.
- **Composite (future)** (`Composite`, kind = `composite`)
  - Intent: represent multi-field cards or checklists. Not required for the first pass but IDs are reserved so prompts can reference them later.

### Conversation + Component Rules
1. **Lead-in first**: one or two sentences explain why the component is surfacing before the UI renders it.
2. **One concept per step**: only group components that solve the same user task (e.g., name + age).
3. **Agent narrates progress**: after submission, acknowledge the data, confirm what changed, and preview the next step.
4. **Fallback path**: if a component errors or the user replies verbally, the Agent can collect answers via plain text and call the endpoint itself.
5. **Traceability**: every rendered component references a specific endpoint/tool so server logs can replay the onboarding journey.
6. **Chaining**: sequence components deliberately (name → age → image, etc.), but treat each as its own conversational turn.

### FTUE Flow (First-Time User Experience)

> **Note:** This section describes an earlier, profile-heavy FTUE sketch. For the **current FTUX Goal+Arc onboarding direction**, see `docs/arc-aspiration-ftue.md` and `docs/feature-briefs/ftux-goal-arc-onboarding.md`. When these conflict, treat those docs as the source of truth for FTUX content and use this doc for Agent window architecture only.

In **v1 implementation**, the FTUE is driven by a workflow (`first_time_onboarding_v2`) authored in `src/domain/workflowSpecs/firstTimeOnboardingV2Spec.ts` and compiled into a `WorkflowDefinition`. `AgentWorkspace` hosts this workflow and surfaces a shared `OnboardingGuidedFlow` presenter as a **step card** beneath `AiChatPane`.

- The Agent:
  - receives **step-specific prompts** (via `FIRST_TIME_ONBOARDING_PROMPT` and WorkflowRuntime),
  - provides warm, contextual copy for each step.
- The host:
  - owns the workflow graph (which step comes next),
  - collects structured data via cards,
  - updates the user profile and local domain store directly.

The JSON-based component system described below is the **future evolution** of this surface. The catalog and `renderableComponents` metadata on chat modes are already in place so prompts can safely reference the components even before full JSON orchestration is wired up.

#### Step 0 – Splash → Agent Landing
- Auto-transition from splash to the Agent view embedded in the canvas.
- InstructionCard (optional) describes “LOMO is setting things up…”.

#### Step 1 – Warm Orientation (no components)
- Agent copy:
  - “Welcome to LOMO. A thoughtful, story-centered planner…”
  - “I’ll guide you through a few quick steps so things feel personal and grounded. 🌱”
- Purpose: set tone, no user input yet.

#### Step 2 – Name + Age (FormFields + optional Progress)
- Lead-in: “To personalize your experience, I’ll start with something simple: your name and age.”
- Components:
  - `FormField(text)` → `POST /user/name`
  - `FormField(number)` → `POST /user/age`
  - `ProgressIndicator` (step 1 of 5 or similar)
- Success response: “Great—thanks. Now let’s set up a few essentials.”

#### Step 3 – Profile Image (Optional Image Upload)
- Lead-in: “If you’d like, you can add a profile image. Totally optional—some people prefer a symbol or leave it blank.”
- Component:
  - `FormField(image)` → `POST /user/profileImage`
- Agent response acknowledges whether the user uploaded or skipped.

#### Step 4 – Notifications (InlineCapability / ActionButtons)
- Lead-in: “Would you like occasional nudges when an Arc needs attention or a goal is due?”
- Components:
  - `ActionButton(primary)` → `POST /settings/notifications?enabled=true`
  - `ActionButton(secondary)` → e.g., `POST /settings/notifications?enabled=false` or mark decline state client-side.
- Agent reply: “Noted. I’ll keep things quiet unless you change your mind.” or “Perfect—nudges are on.”

#### Step 5 – Personalization Seed (Focus Areas Multi-Select)
- Lead-in: “Before you build your first Arc, I’d love to understand where you feel the most momentum—or friction—right now. Pick any that apply.”
- Component:
  - `FormField(multi-select)` with options: Health, Career, Relationships, Spirituality, Creativity.
  - Endpoint: `/user/preferences/focusAreas`
- Agent response: “Great choices. I’ll remember these as we shape your first Arc.”

#### Step 6 – Create the First Arc
- Lead-in: “Ready to create your first Arc? I can generate one for you based on what you’ve shared, or you can start from scratch.”
- Components (InlineCapability or stacked buttons):
  - `ActionButton(primary)` “Generate Starter Arc” → `/arc/generateFromPreferences`
  - `ActionButton(secondary)` “Start from Scratch” → `/arc/createEmpty`
- Agent moves into whichever flow the user picks (e.g., show generated arc summary inside the existing Arc Coach canvas).

#### Step 7 – Closing Message
- After arc creation (or skipping), the Agent summarizes:
  - “You’re set. Whenever you’re ready, ask me to help you refine your Arcs…”
  - Reinforce agency: “This is your story—we’ll build it together. ✨”
- Optionally render a CTA button that deep-links to the Arcs tab canvas if needed.

### State + Endpoint Handling
- **Completion tracker**: client maintains an onboarding state object (nameSubmitted, ageSubmitted, etc.) so the Agent can query before rendering components.
- **Endpoint contracts**:
  - All endpoints return a `{status, data}` envelope so the Agent can confirm success or gracefully narrate errors.
  - For optional fields (image), treat lack of payload as an intentional skip rather than erroring.
- **ProgressIndicator logic**: update step count based on completed endpoints; avoid regressing when user revisits the flow.
- **Retry / fallback**:
  - If an endpoint fails, the Agent apologizes, offers to retry, or collects text input and re-submits on behalf of the user.

### Implementation Notes
- **Prompting hooks**: include a “renderableComponents” section in the agent prompt so the model knows which component IDs and endpoint names exist.
- **Analytics**: log both component render events and endpoint completion events to reconstruct drop-off.
- **Accessibility**: ensure FormField + ActionButton components respect system fonts/colors since they sit within the canvas under the app shell.
- **Extensibility**: when adding new onboarding fields, define the endpoint first, then extend the component registry so prompts stay stable.

