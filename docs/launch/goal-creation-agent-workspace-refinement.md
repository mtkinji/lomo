## Goal creation Agent Workspace — MVP refinement plan

Owner: (TBD)  
Branch: `feat/mvp-goal-creation-agent-workspace-refinement`  
Status: draft

### Why this exists (MVP launch risk)

Goal creation is a core “value realization” flow. For MVP, it must be:

- **Predictable**: Goals always land in the intended Arc (or the user explicitly chooses).
- **Safe**: No “invalid” Goals created with missing `arcId`.
- **Consistent**: Manual + AI flows obey the same limits and UX rules.
- **Within UX architecture**: preserve App Shell + Canvas layering (no full-screen takeover that breaks nav).

### Current implementation touchpoints

- **Host surface**: `src/features/goals/GoalsScreen.tsx` (`GoalCoachDrawer`)
- **Agent orchestrator**: `src/features/ai/AgentWorkspace.tsx`
- **Chat + proposal card UI**: `src/features/ai/AiChatScreen.tsx`
- **Workflow definition**: `src/features/ai/workflows/goalCreationWorkflow.ts`
- **Context snapshot**: `src/features/ai/workspaceSnapshots.ts` (`buildArcCoachLaunchContext`)

---

## Refinement goals (what “working as intended” means)

### A) Correct Arc assignment

- If launched **from Arc Detail**: adopting a goal must always attach to the focused Arc.
- If launched **from Goals tab**:
  - If **0 arcs exist**: user is guided to create an Arc first (no dead end).
  - If **1 arc exists**: adopt attaches to that Arc (no extra step).
  - If **2+ arcs exist**: user must explicitly choose which Arc to attach the Goal to (no silent fallback).

### B) Manual creation safety

- Manual flow must not create a Goal with `arcId === ''`.
- Manual flow should either:
  - require picking an Arc before enabling “Create”, or
  - provide an explicit “Create goal without Arc” pathway only if the domain supports it (currently it does not).

### C) Proposal card matches what the workflow collects

Workflow collects: `title`, `description`, `status`, `forceIntent`.

Pick one:

- **Option 1 (recommended)**: add minimal UI controls to edit `status` + `forceIntent` before adoption.
- **Option 2**: simplify the workflow outcome schema to match editable fields (title/description), and set defaults for the rest.

### D) Monetization + limits are enforced consistently

Once RevenueCat gating is present:

- AI adopt cannot create the **4th active goal** in a Free Arc.
- Manual create cannot create the **4th active goal** in a Free Arc.
- Failure states route to the Paywall (or upgrade sheet) without partial creation.

---

## Implementation plan (concrete tasks)

### 1) Introduce an explicit Arc picker for goal adoption (Goals tab launch, 2+ arcs)

- Add an “Attach to Arc” picker surfaced from the goal proposal card when no focused Arc exists and `arcs.length > 1`.
- Ensure the picker lives inside the existing sheet/canvas flow (no navigation reset).

Files likely touched:

- `src/features/ai/AiChatScreen.tsx` (goal proposal card “Adopt Goal” handler)
- `src/features/goals/GoalsScreen.tsx` (reuse existing Arc picker sheet if feasible)

### 2) Harden manual creation to prevent invalid `arcId`

- Require `draft.arcId` if `launchFromArcId` is not set.
- Disable “Create” until Arc is selected (or show inline validation).

Files:

- `src/features/goals/GoalsScreen.tsx`

### 3) Align workflow schema vs UI controls

- Decide Option 1 or Option 2.
- If Option 1: implement `status` control + a compact force-intent editor in the proposal card.
- If Option 2: update `goalCreationWorkflow` `fieldsCollected` + outcome schema and ensure analytics/completeStep still works.

Files:

- `src/features/ai/AiChatScreen.tsx`
- `src/features/ai/workflows/goalCreationWorkflow.ts`

### 4) Add/verify gating hook points (post-monetization)

- Add a single helper: `canCreateGoal({ isPro, goals, arcId })` (or equivalent) and call it from:
  - AI adopt handler
  - Manual create handler
- Ensure it fails before `addGoal()` is called.

Files:

- `src/features/ai/AiChatScreen.tsx`
- `src/features/goals/GoalsScreen.tsx`
- (new) `src/domain/limits.ts` (recommended)

---

## Acceptance tests (must pass before MVP)

### Arc attachment

- **From Arc detail**: Adopt → new Goal appears in that Arc; no Arc picker shown.
- **Goals tab (0 arcs)**: Attempt adopt → guided “Create an Arc first” path; no silent failure.
- **Goals tab (1 arc)**: Adopt → attaches to that Arc; no picker.
- **Goals tab (2+ arcs)**: Adopt → picker required (button disabled until chosen); choice respected.

### Manual safety

- Manual create cannot proceed unless an Arc is selected (when not launched from an Arc).

### Workflow integrity

- After adoption, workflow step `confirm_goal` completes and the workspace closes/navigates per host.
- Proposal card never duplicates the full goal text in the visible assistant lead-in.

### Shell/canvas preservation

- The Agent Workspace remains inside the existing app shell and returns to the correct canvas after close.


