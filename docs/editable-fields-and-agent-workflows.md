## Editable Fields & Agent Workflows – UX & Implementation Plan

### 1. Purpose & scope

This doc defines a **shared UX + implementation pattern** for:

- **Editing any domain object** (Arcs, Goals, Activities, Chapters).
- **Inline editing behavior** for all fields.
- **How and when AI (AgentWorkspace) participates** in edits.

It is intentionally **object‑agnostic**: detail screens for different objects plug their own fields + labels into the same primitives and workflows.

---

### 2. Core principles

- **Inline first, AI assisted**
  - Users can **edit any field directly** on the canvas (no AI required).
  - AI is an **optional accelerator** for reframing, rewriting, or re‑planning—never a gate.

- **Single agent surface**
  - All AI interactions run through a single **AgentWorkspace** bottom sheet (chat + cards), not scattered mini‑widgets.
  - Multiple **entry points (triggers)**, one **AI system**.

- **Shell vs canvas**
  - **AppShell** owns:
    - Primary navigation, period context.
    - Canvas gutters and shell background.
  - **Detail screens** live in the canvas and host:
    - Fields rendered via shared editable primitives.
    - A floating “Ask LOMO” FAB.

- **Consistency across objects**
  - Arcs/Goals/Activities/Chapters share the **same field state machine** and visual language.
  - Object‑specific logic lives only in:
    - Which fields exist.
    - How changes map to store actions / tools.
    - What `launchContext` we pass into AgentWorkspace.

---

### 3. Field model & states

We categorize fields by behavior, but all share the same **state machine**.

- **Field categories**
  - **Atomic inline fields**: single‑line text (titles), numbers, simple pickers, toggles.
  - **Rich text fields**: multi‑line narratives, descriptions, notes.
  - **Computed / summary fields**: derived or structural values that are edited via workflows (e.g., forceIntent distribution, activity plans).

- **States (for any editable field)**
  1. **Read‑only (default)**
     - Label + value.
     - Subtle “this is editable” affordance (row press, optional pencil icon).
  2. **Pressed**
     - Slight background tint/feedback while pressing.
  3. **Editing**
     - Replaces value with an input (single‑ or multi‑line).
     - Adds border + radius + focused styles.
     - Shows local editor chrome (Cancel / Done; optional inline AI button for rich text).
  4. **Error**
     - Same as Editing, with destructive border + helper text.
  5. **Disabled**
     - Muted label + value; no press feedback, no edit affordance.

- **Global behavior rules**
  - **Tap row** → enters Editing (if not disabled).
  - **Cancel** → revert to last saved value, return to Read‑only.
  - **Done** → validate; if OK, commit changes (local state and/or store) and return to Read‑only.
  - **Tap outside while editing**
    - We choose one behavior and apply it everywhere:
      - Preferred: **auto‑save on blur** (equivalent to Done) for low friction.
      - Alternative: **discard on blur** (equivalent to Cancel) if we want stronger confirmation.

---

### 4. Object‑agnostic primitives

All feature code should use these **shared primitives** instead of custom per‑screen edit UIs.

#### 4.1 `EditableField` (single‑line / atomic)

**Use for:** titles, short labels, numbers, small text fields, simple “choose one” pickers.

- **Read state**
  - Layout:
    - Label above or to the left (small, muted).
    - Value in primary text style.
  - Visual:
    - Label: typography `label` / tone `secondary`.
    - Value: typography `body` / `bodySm` or heading for titles.
    - Optional right‑aligned pencil icon or chevron.
  - Interaction:
    - Entire row is pressable; on press → Editing.

- **Edit state**
  - Value replaced by a single‑line `TextInput` styled like an input.
  - Border + radius; focus border color = accent.
  - Cancel / Done row:
    - Right‑aligned small text buttons or compact buttons.
  - Value commits via Done or blur (according to global behavior).

- **Suggested props (conceptual)**
  - `label: string`
  - `value: string`
  - `onChange(next: string): void`
  - `onSubmit?(next: string): void`
  - `placeholder?: string`
  - `disabled?: boolean`
  - `validate?(next: string): string | null` (error message or null)
  - `variant?: 'title' | 'body' | 'meta'` (maps to typography)

Implementation: **pure React Native** + `src/theme/*`:

- `View`, `Pressable`, `Text`, `TextInput`, `StyleSheet`.
- `colors`, `spacing`, `typography` (no direct dependency on React Native Reusables).

#### 4.2 `EditableTextArea` (multi‑line + optional AI)

**Use for:** Arc narrative, Goal description, free‑form notes.

- **Collapsed read state**
  - Label + value, truncated to N lines (e.g., 3) with ellipsis/fade if long.
  - Tap anywhere → Editing.

- **Expanded edit state**
  - Card expands vertically.
  - Multi‑line `TextInput` with:
    - Input border + radius.
    - Fixed min height (e.g., 4–6 lines) and scroll if long.
  - Local toolbar (above textarea or above keyboard):
    - `Cancel` / `Done`.
    - Optional **“Refine with LOMO”** wand button when `enableAi` is true.

- **AI integration behavior**
  - When the inline wand is tapped:
    - Component calls `onRequestAiHelp` with:
      - `currentText`
      - `objectType` (`'arc' | 'goal' | 'activity' | 'chapter'`)
      - `objectId`
      - `fieldId` (e.g. `'narrative'`, `'description'`)
    - The parent is responsible for:
      - Opening `AgentWorkspace` with the right `mode` + `launchContext`.
      - Receiving an AI suggestion and calling `onChange(suggestedText)`.
  - The textarea itself **does not** embed chat or complex AI UI—only a button that hands off context to AgentWorkspace.

- **Suggested props (conceptual)**
  - `label: string`
  - `value: string`
  - `onChange(next: string): void`
  - `onSubmit?(next: string): void`
  - `placeholder?: string`
  - `disabled?: boolean`
  - `maxCollapsedLines?: number`
  - `validate?(next: string): string | null`
  - `enableAi?: boolean`
  - `onRequestAiHelp?(args: { objectType; objectId; fieldId; currentText }): void`

Implementation: same stack as `EditableField` (plain RN + theme).

---

### 5. AgentWorkspace integration

We want **one AI surface** (AgentWorkspace) with several **entry points**.

#### 5.1 Entry points

- **Screen‑level floating action button (FAB)**
  - Present on any **object detail canvas** (Arc, Goal, Activity, Chapter).
  - Visual:
    - Floating circular button in bottom‑right or bottom‑edge corner.
    - Wand icon + optional “Ask LOMO” label.
  - Behavior:
    - When tapped, calls `openAgentWorkspaceForScreenContext` with:
      - `objectType` + `objectId`.
      - Optional summary of related objects (e.g., goals for an arc).
    - Opens `AgentWorkspace` in an **edit mode**, e.g.:
      - `arcEditing`
      - `goalEditing`
      - `activityEditing`
    - Initial cards:
      - Snapshot of the object and its children.
      - Prompt suggestions like “Help me reshape this Arc” or “Review these goals”.

- **Field‑level AI button (inside `EditableTextArea`)**
  - Only appears in **Edit state** when `enableAi` is true.
  - Label “Refine with LOMO” + wand icon.
  - Behavior:
    - Calls a shared helper (e.g., `openAgentWorkspaceForFieldContext`) with:
      - `objectType`, `objectId`
      - `fieldId`, `currentText`
    - AgentWorkspace launches in the same relevant mode, but with a **focused intent**:
      - “Help refine the {fieldId} text for this {objectType}.”
    - Workspace shows:
      - Current draft as a read‑only card.
      - Suggested rewrites as cards with “Use this” actions.
    - When user selects a suggestion:
      - Parent calls `onChange(suggestedText)` on the `EditableTextArea`.
      - Editor remains in Edit state; user can still tweak and tap Done.

Both entry points share the **same visual identity** (wand) and surface (AgentWorkspace) so it feels like one coherent AI system.

#### 5.2 `launchContext` examples

- **Screen‑level**
  - `{ source: 'ArcDetail', intent: 'arcEditing', arcId }`
  - `{ source: 'GoalDetail', intent: 'goalEditing', goalId }`

- **Field‑level**
  - `{ source: 'ArcDetail', intent: 'editField', objectType: 'arc', objectId: arcId, fieldId: 'narrative', currentText }`
  - `{ source: 'GoalDetail', intent: 'editField', objectType: 'goal', objectId: goalId, fieldId: 'description', currentText }`

These `launchContext` payloads are consumed by AgentWorkspace to:

- Pick the correct `chatMode` (e.g., `arcEditing` vs `goalEditing`).
- Construct initial system prompt + user‑visible intro.
- Decide which tools are available (e.g., `suggestArcNarrative`, `proposeGoalSetChanges`, etc.).

---

### 6. Object‑specific usage

#### 6.1 Arcs

- **Typical fields**
  - `name`: `EditableField` (`variant="title"`).
  - `narrative`: `EditableTextArea` with `enableAi=true`.
  - Focus period / metadata: `EditableField` or pickers.
  - Thumbnail style: separate visual picker (not part of this spec).

- **Agent flows**
  - FAB → `arcEditing`:
    - Reshape arc narrative and forceIntent.
    - Suggest creating/retiring related goals.
  - Field‑level AI:
    - Refine narrative phrasing, length, tone.

#### 6.2 Goals

- **Typical fields**
  - `title`: `EditableField` (`variant="title"`).
  - `description`: `EditableTextArea` with `enableAi=true`.
  - `metrics`: `EditableField` or small composite editor.
  - `forceIntent`: sliders / chips (editable via custom UI; AI can propose rebalances).

- **Agent flows**
  - FAB → `goalEditing`:
    - Clarify / rephrase goal.
    - Suggest metrics.
    - Propose changes across the set of goals in an arc.
  - Field‑level AI:
    - Make a specific goal more concrete, measurable, or aligned with intent.

#### 6.3 Activities

- **Typical fields**
  - `title`: `EditableField`.
  - `notes`: `EditableTextArea` (optional AI).
  - `estimate`, `date`, `status`: atomic editors.

- **Agent flows**
  - FAB → `activityEditing`:
    - Suggest lighter‑weight versions.
    - Propose sequences or alternatives for a goal.
  - Field‑level AI:
    - Refine notes / instructions.

#### 6.4 Chapters

- **Typical fields**
  - Generated narrative text blocks (could be multiple sections).
  - Title: `EditableField`.
  - Body sections: either `EditableTextArea` per section, or a combined editor.

- **Agent flows**
  - FAB:
    - Ask follow‑up questions, propose alternative summaries, etc.
  - Field‑level AI:
    - Tighten or reframe specific sections.

---

### 7. Implementation checklist

This is the working checklist for bringing the plan to life.

1. **Finalize visual + interaction rules**
   - Confirm:
     - Label and value typography/tone for each state.
     - Border, radius, and padding for Editing state.
     - Behavior of blur while editing (auto‑save vs discard).
     - Exact placement + size of Cancel/Done controls.
     - Wand iconography and labels (“Ask LOMO”, “Refine with LOMO”).

2. **Implement primitives (RN + theme only)**
   - Create `src/ui/EditableField.tsx`:
     - Internal `isEditing` state.
     - Read and Edit render paths.
     - Validation + error display.
   - Create `src/ui/EditableTextArea.tsx`:
     - Collapsed and expanded modes.
     - Rich text editing with multi‑line `TextInput`.
     - Optional inline AI button wired to `onRequestAiHelp`.

3. **Create Agent entry helpers**
   - Implement a small helper or hook (e.g., `useAgentLauncher`) that exposes:
     - `openForScreenContext({ objectType, objectId })`.
     - `openForFieldContext({ objectType, objectId, fieldId, currentText })`.
   - Wire helpers to:
     - FAB on detail screens.
     - `EditableTextArea.onRequestAiHelp`.

4. **Add floating FAB to object detail canvases**
   - Implement a simple `AgentFab` in `src/ui/AgentFab.tsx`.
   - Mount it in:
     - `ArcDetailScreen`
     - `GoalDetailScreen`
     - `ActivityDetailScreen`
     - (Optionally) Chapter detail
   - Use `openForScreenContext` on press.

5. **Retrofit detail screens to use primitives**
   - Start with **Arc**:
     - Replace current ad‑hoc title/narrative editors with `EditableField` / `EditableTextArea`.
     - Hook `onChange`/`onSubmit` into `updateArc`.
     - Enable AI for `narrative` via `onRequestAiHelp`.
   - Repeat for **Goals**, then **Activities**, then **Chapters**.

6. **QA and polish**
   - Verify:
     - Editing flows on iOS/Android (keyboard behavior, safe‑area insets).
     - Error states (validation messages, blocked Done).
     - AI flows from both FAB and inline textareas:
       - Context is correct in AgentWorkspace.
       - Returned suggestions correctly update field values.
   - Adjust spacing and typography so fields feel cohesive across all screens.

This doc should be the **source of truth** for editing UX and the relationship between inline edits and AgentWorkspace. As we build, we should update it with any deviations or refinements.


