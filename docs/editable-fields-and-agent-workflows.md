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
    - A floating circular FAB in the bottom‑right (sparkles icon, no brand text).

- **Consistency across objects**
  - Arcs/Goals/Activities/Chapters share the **same field state machine** and visual language.
  - Object‑specific logic lives only in:
    - Which fields exist.
    - How changes map to store actions / tools.
    - What `launchContext` we pass into AgentWorkspace.

- **Stable layout, minimal reflow**
  - Entering edit mode **does not move fields around**:
    - Atomic fields keep the same height and padding; only the caret + border change.
    - Textareas grow **vertically** in a controlled way when editing to make room for inline AI affordances, without shifting surrounding sections.

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
     - Field chrome stays in place; the value is now an active input (single‑ or multi‑line).
     - Adds border + radius + focused styles (accent border).
     - For rich text, may reveal an **inline “Refine with AI” button** while editing.
  4. **Error**
     - Same as Editing, with destructive border + helper text.
  5. **Disabled**
     - Muted label + value; no press feedback, no edit affordance.

- **Global behavior rules**
  - **Tap row** → enters Editing (if not disabled).
  - **Tap outside / blur while editing**
    - We use **auto‑save on blur** everywhere:
      - Validate, commit changes if valid, and return to Read‑only.
      - On validation failure, stay in Editing and show an inline error.

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
    - Entire row is pressable; on press, the underlying input receives focus (caret appears).

- **Edit state**
  - Layout stays the same:
    - Same label.
    - Same field “box” (background, padding, radius).
  - The inner element is an always‑present single‑line `TextInput`:
    - In read state it simply isn’t focused.
    - In edit state it is focused with an accent border on the wrapper.
  - Value commits via **blur** (auto‑save) or pressing return, following validation rules.

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
  - Tap anywhere → focuses the underlying multi‑line input (Editing).

- **Expanded edit state**
  - Same card + label layout; the textarea **grows vertically** when editing.
  - Multi‑line `TextInput` with:
    - Input border + radius.
    - Fixed minimum height and scroll if content exceeds it.
  - When `enableAi` is true and the field is editing:
    - An inline **“Refine with AI”** button appears anchored to the **bottom‑right inside the textarea**.
    - Extra padding and height ensure the button sits on its own line below the text with breathing room.

- **AI integration behavior**
  - When the inline AI button is tapped:
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
    - Sparkles icon only (no brand text while naming is in flux).
  - Behavior:
    - When tapped, calls `openForScreenContext({ objectType, objectId })` from `useAgentLauncher`.
    - Opens `AgentWorkspace` anchored to that object (e.g., an Arc or Goal), using the launch context string to describe purpose.
    - Initial cards:
      - Snapshot of the object and its children.
      - Prompt suggestions like “Help me reshape this Arc” or “Review these goals”.

- **Field‑level AI button (inside `EditableTextArea`)**
  - Only appears in **Edit state** when `enableAi` is true.
  - Label “Refine with AI” with a sparkles icon.
  - Behavior:
    - Calls a shared helper `openForFieldContext({ objectType, objectId, fieldId, currentText })` from `useAgentLauncher`.
    - AgentWorkspace launches with a **focused intent**:
      - “Help refine the {fieldId} text for this {objectType},” including the current text in the launch context payload.
    - Workspace shows:
      - Current draft as a read‑only card.
      - Suggested rewrites as cards with “Use this” actions.
    - When user selects a suggestion:
      - Parent calls `onChange(suggestedText)` on the `EditableTextArea`.
      - Editor remains in Edit state; user can still tweak and tap Done.

Both entry points share the **same visual identity** (sparkles) and surface (AgentWorkspace) so it feels like one coherent AI system.

#### 5.2 `useAgentLauncher` helper and `launchContext` shape

- **Helper API (conceptual)**
  - `useAgentLauncher(workspaceSnapshot?: string)`
    - Returns:
      - `openForScreenContext({ objectType: 'arc' | 'goal' | 'activity' | 'chapter'; objectId: string })`
      - `openForFieldContext({ objectType; objectId; fieldId: string; currentText: string; fieldLabel?: string })`
      - `AgentWorkspaceSheet` React node to render near the root of the detail screen.
      - `isAgentOpen: boolean`

- **Screen‑level launchContext examples**
  - `{ source: 'arcDetail', intent: 'arcEditing', objectType: 'arc', objectId: arcId }`
  - `{ source: 'goalDetail', intent: 'goalEditing', objectType: 'goal', objectId: goalId }`

- **Field‑level launchContext examples**
  - `{ source: 'arcDetail', intent: 'editField', objectType: 'arc', objectId: arcId, fieldId: 'narrative', fieldLabel: 'Arc narrative', currentText }`
  - `{ source: 'goalDetail', intent: 'editField', objectType: 'goal', objectId: goalId, fieldId: 'description', currentText }`

These `launchContext` payloads are consumed by AgentWorkspace to:

- Construct a rich launch context string (source, intent, object, field, and current text).
- Combine that context with the active `ChatMode` (when present) and any workspace snapshot string.

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
    - When using AI to substantially reshape an Arc, prompts should follow the **gold-standard Arc model** in `docs/arc-aspiration-ftue.md` (domain of becoming, motivational style, signature trait, growth edge, everyday proud moment) so `Arc.name` and `Arc.narrative` stay aligned with the identity-first FTUE.

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

### 7. Implementation checklist (with status)

This is the working checklist for bringing the plan to life.  
Status legend: **[x] done** · **[~] in progress / partial** · **[ ] not started**

1. **Finalize visual + interaction rules** – **[x]**
   - [x] Label and value typography/tone for each state.
   - [x] Border, radius, and padding for Editing state.
   - [x] Behavior of blur while editing (auto‑save everywhere, with inline errors).
   - [x] Placement of inline AI affordance (bottom‑right inside textarea while editing).
   - [x] Copy for AI entry points (“Ask LOMO”, “Refine with AI”).

2. **Implement primitives (RN + theme only)** – **[x]**
   - [x] `src/ui/EditableField.tsx`:
     - Always-on `TextInput` with internal `isEditing` state.
     - Stable layout in read vs edit.
     - Validation + error display.
   - [x] `src/ui/EditableTextArea.tsx`:
     - Collapsed read state + expanded edit state.
     - Multi‑line `TextInput` with controlled growth.
     - Inline **“Refine with AI”** button wired to `onRequestAiHelp`.

3. **Create Agent entry helpers** – **[~]**
   - [x] Implement a helper/hook `useAgentLauncher` that exposes:
     - `openForScreenContext({ objectType, objectId })`.
     - `openForFieldContext({ objectType, objectId, fieldId, currentText })`.
   - [~] Wire helpers to:
     - [x] FAB on Arc detail.
     - [x] Arc narrative `EditableTextArea.onRequestAiHelp`.
     - [~] FAB and field editors on Goal / Activity / Chapter detail.
       - [x] Goal FAB + description `EditableTextArea.onRequestAiHelp`.
       - [ ] Activity / Chapter FAB + field editors.

4. **Add floating FAB to object detail canvases** – **[~]**
   - [x] Implement `AgentFab` in `src/ui/AgentFab.tsx`.
   - [x] Mount it in `ArcDetailScreen` and wire to `openForScreenContext`.
   - [~] Mount in `GoalDetailScreen`, `ActivityDetailScreen`, (optionally) Chapter detail.
     - [x] Mount and wire in `GoalDetailScreen`.
     - [ ] Mount in `ActivityDetailScreen`, (optionally) Chapter detail.

5. **Retrofit detail screens to use primitives** – **[~]**
   - [x] **Arc**:
     - Replace ad‑hoc title/narrative editors with `EditableField` / `EditableTextArea`.
     - Hook `onChange`/`onSubmit` into `updateArc`.
     - Enable AI for `narrative` via `EditableTextArea.enableAi` + `onRequestAiHelp` wired to `useAgentLauncher`.
   - [x] **Goals**:
     - Use `EditableField` / `EditableTextArea` for goal title/description.
     - Enable AI for `description` via `EditableTextArea.enableAi` + `onRequestAiHelp` wired to `useAgentLauncher`.
   - [ ] **Activities**:
     - Use `EditableField` (title) and optional `EditableTextArea` (notes).
   - [ ] **Chapters**:
     - Use `EditableField` (title) and `EditableTextArea` for narrative sections.

6. **QA and polish** – **[~]**
   - [x] iOS behavior verified on Arc detail (keyboard, focus/blur).
   - [ ] Android behavior (keyboard + safe‑area) verified.
   - [x] Error states confirmed for `EditableField` / `EditableTextArea`.
   - [ ] Full AI flow from both FAB and inline textareas:
     - [ ] Context is correct in AgentWorkspace.
     - [ ] Returned suggestions correctly update field values.
   - [x] Spacing and typography tuned for Arc detail; extend to other screens as they adopt the primitives.

This doc should be the **source of truth** for editing UX and the relationship between inline edits and AgentWorkspace. As we build, we should update it with any deviations or refinements.


