## Agent Window Component System & FTUE

### Purpose
- Capture how the chat-based Agent surface orchestrates declarative components while keeping LOMO’s app shell + canvas hierarchy intact.
- Provide a reference FTUE that engineering, design, and prompt authors can point to when wiring the onboarding experience.

### Agent Window as a Component-Orchestrated Surface
- **Placement**: lives inside the canvas, under the persistent app shell (nav + contextual chrome). Never replaces the shell; instead, it occupies the canvas area that the user lands on after the splash.
- **Structured surface**: the Agent emits JSON that the UI renders as composable blocks sitting inline with conversational text.
- **Design principles**
  - Declarative: Agent specifies `componentId`, `props`, and optional bindings; UI handles rendering.
  - Actionable: every component maps to a backend endpoint or agent-defined function (tool).
  - Composable: multiple components can share a message bubble when they represent one cohesive step.
  - State-aware: the Agent can query completion state before deciding to render (avoid asking twice).

### Component Catalog (V1 scope)
- **FormField** (`text`, `number`, `date`, `image`, `select`, `multi-select`, `toggle`)
  - Props: `label`, `helperText`, `endpoint`, `method` (`POST` for now), validation hints.
  - Example bindings: `/user/name`, `/user/age`, `/user/profileImage`, `/user/preferences/focusAreas`.
- **ActionButton**
  - Props: `label`, `kind` (`primary`, `secondary`, `inline`), `endpoint`, payload template.
  - Example bindings: `/settings/notifications`, `/arc/generateFromPreferences`, `/arc/createEmpty`.
- **InstructionCard**
  - Props: `title`, `body`, optional `image`.
  - Purely informational; pairs with conversation to set expectations.
- **ProgressIndicator**
  - Props: `currentStep`, `totalSteps`, optional labels.
  - Mirrors onboarding state so the Agent can reinforce momentum.
- **InlineCapability**
  - Lightweight action clusters embedded within text, e.g., `[Enable] [Skip]`.
  - Still backed by ActionButton endpoints.
- **Composite (future)**
  - Multi-field cards or checklists.
  - Not required for the first pass but keep IDs reserved so prompts can reference them later.

### Conversation + Component Rules
1. **Lead-in first**: one or two sentences explain why the component is surfacing before the UI renders it.
2. **One concept per step**: only group components that solve the same user task (e.g., name + age).
3. **Agent narrates progress**: after submission, acknowledge the data, confirm what changed, and preview the next step.
4. **Fallback path**: if a component errors or the user replies verbally, the Agent can collect answers via plain text and call the endpoint itself.
5. **Traceability**: every rendered component references a specific endpoint/tool so server logs can replay the onboarding journey.
6. **Chaining**: sequence components deliberately (name → age → image, etc.), but treat each as its own conversational turn.

### FTUE Flow (First-Time User Experience)

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


