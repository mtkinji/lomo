# Kwilt Cross-Workspace Cursor Planning

## Goal

Let Cursor, from any code workspace, do both of these against Kwilt:

1. Create or update the project's current Goal.
2. Create, sync, and complete the project's Activities while reporting progress back to Kwilt.

Kwilt remains the source of truth. Cursor's local todo list is only a working mirror.

## User Story

- In the `Kwilt` repo, Cursor should understand that the active project goal is something like "Get Google approval video submitted and accepted for Calendar integration."
- In the `Orchard` repo, Cursor should instead operate against Orchard's active goal.
- In the `Torii` repo, Cursor should operate against Torii's active goal.
- Cursor should be able to create the goal and backlog when asked, then execute from that queue later.

## Current State

Already implemented:

- `kwilt_execution_targets` identifies per-repo execution targets.
- `kwilt_activity_handoffs` gates which Activities are executable by Cursor.
- `kwilt-mcp` already supports:
  - `kwilt.list_execution_targets`
  - `kwilt.list_tasks`
  - `kwilt.get_task`
  - `kwilt.get_repo_context`
  - `kwilt.post_progress`
  - `kwilt.attach_artifact`
  - `kwilt.set_status`

Missing for the desired workflow:

- A way to read and write project-level Goal selection.
- A way for Cursor to create Goals and Activities directly in Kwilt.
- A way to ask "what is the active Goal for this repo?"
- A way to map newly created Activities into the execution queue without requiring app-only manual steps.

## Product Model

Use this model consistently:

- `Execution target`
  - Represents one code project / repo.
  - Examples: `Kwilt app`, `Orchard`, `Torii`.
- `Goal`
  - Represents the current project objective.
  - Examples: "Ship Google Calendar approval video", "Stabilize Orchard onboarding".
- `Activity`
  - Represents one concrete unit of work under that Goal.
- `Handoff`
  - Represents that an Activity is executable by Cursor for that execution target.

Important rule:

- A project may have many Goals over time, but only one `active Goal` per execution target at a time for Cursor's default planning context.

## Recommended Architecture

### 1) Add project planning state on the execution target

Store project-level planning metadata on `kwilt_execution_targets.config` instead of creating a brand new table first.

Add these fields inside `config`:

```json
{
  "repo_name": "Kwilt",
  "repo_url": "https://github.com/...",
  "branch_policy": "feature_branch",
  "verification_commands": [],
  "active_goal_id": "goal_123",
  "planning_notes": "Optional repo-level planning context",
  "default_activity_handoff": true
}
```

Why this shape:

- It keeps the first version small.
- It avoids a migration just to store one active-goal pointer.
- It fits the existing execution target concept.

If the feature grows later, move `active_goal_id` into a dedicated table like `kwilt_execution_target_planning_state`.

### 2) Extend MCP from execution-only to planning + execution

Add these tools to `kwilt-mcp`.

Project context:

- `kwilt.get_active_goal_for_execution_target`
- `kwilt.set_active_goal_for_execution_target`

Goal management:

- `kwilt.list_goals`
- `kwilt.create_goal`
- `kwilt.update_goal`

Activity management:

- `kwilt.list_activities`
- `kwilt.create_activity`
- `kwilt.update_activity`
- `kwilt.handoff_activity`

Optional but useful:

- `kwilt.bulk_create_activities`
- `kwilt.bulk_handoff_activities`

Do not add delete tools in v1. Soft lifecycle changes are enough:

- Goals: `planned`, `in_progress`, `completed`, `archived`
- Activities: `planned`, `in_progress`, `done`, `cancelled`, `skipped`

### 3) Keep execution gated by explicit handoff

Do not make every Activity under the active Goal automatically executable.

Keep this distinction:

- Goal/Activity planning can be broad.
- Cursor execution queue must stay explicit through handoff rows.

Recommended v1 default:

- When Cursor creates Activities for the active Goal, it may hand them off automatically only if `execution_target.config.default_activity_handoff === true`.
- Otherwise it should create them first, then ask before handing off.

## MCP Tool Specs

### `kwilt.get_active_goal_for_execution_target`

Purpose:

- Resolve the default planning context for the current repo.

Input:

```json
{
  "execution_target_id": "uuid"
}
```

Output:

```json
{
  "execution_target_id": "uuid",
  "active_goal_id": "goal_id_or_null",
  "goal": {
    "id": "goal_id",
    "title": "Get Google approval video submitted",
    "description": "...",
    "status": "in_progress"
  }
}
```

### `kwilt.set_active_goal_for_execution_target`

Purpose:

- Change which Goal Cursor should treat as the project's default goal.

Input:

```json
{
  "execution_target_id": "uuid",
  "goal_id": "goal_id"
}
```

Behavior:

- Validate ownership.
- Validate that the Goal exists.
- Write `config.active_goal_id`.

### `kwilt.list_goals`

Purpose:

- Let Cursor inspect current or historical project goals.

Input:

```json
{
  "execution_target_id": "uuid",
  "status": ["planned", "in_progress"],
  "limit": 20
}
```

Behavior:

- Return Goals scoped to the authenticated user.
- If `execution_target_id` is present, prefer Goals linked to that repo context by:
  - `config.active_goal_id`
  - explicit metadata on Goal
  - or Activity membership inferred through handoffs

Implementation note:

- The cleanest v1 is to add lightweight repo metadata on Goal itself via domain JSON, for example:

```json
{
  "executionContext": {
    "executionTargetIds": ["uuid"]
  }
}
```

### `kwilt.create_goal`

Purpose:

- Let Cursor create a new project goal from a natural planning request.

Input:

```json
{
  "title": "Get Google approval video submitted and accepted",
  "description": "Record, verify, and submit the updated review video for Google Calendar integration approval.",
  "status": "in_progress",
  "priority": 1,
  "execution_target_id": "uuid",
  "set_active": true
}
```

Behavior:

- Create the Goal in the normal goal domain model.
- If `execution_target_id` is provided, attach repo metadata to the Goal.
- If `set_active` is true, update `config.active_goal_id`.

### `kwilt.list_activities`

Purpose:

- Read the task list for a Goal, optionally filtered to the execution queue.

Input:

```json
{
  "goal_id": "goal_id",
  "execution_target_id": "uuid",
  "include_handoff_state": true,
  "status": ["planned", "in_progress"]
}
```

Output should include:

- Activity fields needed for planning.
- Optional handoff state for the specified execution target.

### `kwilt.create_activity`

Purpose:

- Create one Activity under a Goal.

Input:

```json
{
  "goal_id": "goal_id",
  "title": "Record updated Google review video",
  "description": "Capture the end-to-end consent and calendar sync flow required for review.",
  "status": "planned",
  "type": "task",
  "handoff_to_execution_target_id": "uuid"
}
```

Behavior:

- Create the Activity in the normal domain model.
- If `handoff_to_execution_target_id` is present, create or update the handoff row with `READY`.

### `kwilt.update_activity`

Purpose:

- Let Cursor keep Activity status aligned with reality.

Allowed updates in v1:

- `title`
- `description`
- `status`
- `priority`
- `steps`
- `goal_id` if reparenting is needed

### `kwilt.handoff_activity`

Purpose:

- Explicitly add an Activity to the execution queue for a repo.

Input:

```json
{
  "activity_id": "activity_id",
  "execution_target_id": "uuid",
  "acceptance_criteria": [
    "Updated video is recorded",
    "Submission meets Google reviewer requirements"
  ],
  "verification_steps": [
    "Confirm final video file exists",
    "Confirm submission payload/checklist is complete"
  ]
}
```

Behavior:

- Upsert `kwilt_activity_handoffs`.
- Set `handed_off=true`, `status=READY`.
- Store work packet fields when provided.

## Data Model Notes

### Goal metadata

Goals likely need lightweight execution-target metadata so Cursor can query "goals for this repo" without fragile inference.

Recommended addition to `Goal` domain JSON:

```ts
executionContext?: {
  executionTargetIds?: string[];
  isPrimaryForExecutionTarget?: string | null;
};
```

### Activity metadata

Activities do not need much new schema for this feature because the handoff table already carries execution state.

Only add Activity-level metadata if it improves planning UX, for example:

```ts
planningContext?: {
  createdBy?: 'user' | 'cursor' | 'ai';
  sourceExecutionTargetId?: string | null;
};
```

## Cursor Workflow

For every workspace, Cursor should follow this loop:

1. `kwilt.list_execution_targets`
2. Resolve the matching execution target for the repo
3. `kwilt.get_active_goal_for_execution_target`
4. If no active goal exists:
   - ask whether to create one
   - or offer to choose from existing goals
5. `kwilt.list_activities` for that goal
6. Mirror active items into Cursor's local todo list
7. When working an item:
   - `kwilt.set_status(... IN_PROGRESS)`
   - `kwilt.post_progress(...)`
8. When verified:
   - update Activity domain status to `done`
   - `kwilt.set_status(... DONE)`

For planning requests like "create goals and tasks for this repo", Cursor should:

1. Resolve the repo execution target.
2. Summarize the current project state from the repo.
3. Propose a Goal.
4. Create the Goal in Kwilt.
5. Set it active for the repo.
6. Create a first-pass task list as Activities.
7. Hand off only the actionable subset.

## Cursor Prompt Contract

Use a standard operator prompt across repos:

> Resolve the execution target for this repository. Read the active Goal for that target. If the user asks for planning, create or update the Goal and its Activities in Kwilt first. If the user asks for execution, work only from Activities explicitly handed off to this execution target. Post progress frequently and mark tasks done only after verification.

Additional planning rule:

> When no active Goal exists, do not guess silently. Offer to create one from the current repo context or let the user pick an existing Goal.

## App UX Changes

Keep the existing UX layers intact:

1. App shell
2. Page canvas

Do not create a workflow that bypasses those layers.

Recommended UI additions:

- On `DestinationDetailScreen`:
  - show current active Goal
  - allow "Set active Goal"
  - allow "Create Goal for this project"
- On Goal detail:
  - show linked execution targets
  - allow "Make active for project"
- On Activity detail:
  - keep "Send to..." / handoff actions explicit

Recommended navigation shape:

- Settings -> Send to... -> Project destination detail
- Goal detail canvas remains the canonical place to understand a Goal
- Activity detail canvas remains the canonical place to understand and hand off a task

## Implementation Phases

### Phase 1: Planning metadata + MCP read/write

- Add `active_goal_id` to execution target config handling.
- Add MCP tools:
  - `get_active_goal_for_execution_target`
  - `set_active_goal_for_execution_target`
  - `list_goals`
  - `create_goal`
  - `list_activities`
  - `create_activity`
  - `handoff_activity`

Success criteria:

- From any repo, Cursor can create a Goal and task list in Kwilt.
- Cursor can set and later re-read the repo's active Goal.

### Phase 2: App surfaces

- Add active-goal controls to destination detail.
- Add linked execution-target context on Goal detail.
- Add a lightweight "project planning" entry point in Settings.

Success criteria:

- The user can inspect and change project planning state from the app.

### Phase 3: Better automation

- Add `bulk_create_activities`.
- Add heuristics for selecting which generated Activities are auto-handed-off.
- Add prompt conventions so Cursor mirrors its local todo list from Kwilt at session start.

Success criteria:

- Creating and maintaining project backlogs from Cursor feels fast.
- Execution queue stays clean and explicit.

## Suggested First Repo Examples

### Kwilt app

Execution target:

- `Kwilt app`

Active Goal:

- `Get Google approval video submitted and accepted for Calendar integration`

Seed Activities:

- Review Google's latest rejection or reviewer guidance
- Define the exact approval checklist
- Record updated app walkthrough
- Verify consent and calendar sync states are clearly shown
- Submit updated review materials
- Track review result and next follow-up

### Orchard

Execution target:

- `Orchard`

Active Goal:

- `Stabilize onboarding and define launch-ready baseline`

### Torii

Execution target:

- `Torii`

Active Goal:

- `Define current milestone and convert open technical work into executable tasks`

## Recommendation

Build this as an extension of the existing execution-target model, not as a second planning system.

The key product idea is:

- Kwilt owns goals and tasks.
- Each repo has one active Goal.
- Cursor can both plan into Kwilt and execute from Kwilt.
- Explicit handoff remains the boundary between "tracked" and "ready for the coding agent."
