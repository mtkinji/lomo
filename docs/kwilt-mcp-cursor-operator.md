# Kwilt MCP + Cursor Operator (v1)

Kwilt is the system of record for tasks (“Activities”). Cursor is the execution cockpit. The Kwilt MCP server bridges “intent” → “tool calls”.

## What you get in v1

- A **curated “Send to…” library** with a first executor: **Cursor (MCP executor)**.
- A Settings screen in the app to **install/configure** a Cursor execution target.
- A Supabase Edge Function MCP server (`kwilt-mcp`) exposing these tools via **Streamable HTTP**:
  - `kwilt.list_execution_targets`
  - `kwilt.list_tasks`
  - `kwilt.get_task`
  - `kwilt.get_repo_context`
  - `kwilt.post_progress`
  - `kwilt.attach_artifact`
  - `kwilt.set_status`
- Per-user **Personal Access Tokens (PAT)** for Cursor to use as a stable secret.

## Key safety rules (server enforced)

- Cursor can only operate on tasks that are:
  - scoped to a specific `execution_target_id`, and
  - explicitly handed off (`handed_off=true`), and
  - owned by the PAT’s user.

## Setup

### 1) Apply migrations

Apply the latest migrations in [`supabase/migrations/`](../supabase/migrations/) so the `kwilt_*` tables exist.

### 2) Install a Cursor execution target (in the app)

In the Kwilt app:
- Settings → **Send to…**
- Install **Cursor (MCP executor)**
- Fill:
  - repo name
  - (optional) repo URL
  - verification commands (one per line)

This creates a `kwilt_execution_targets` row and gives it a stable `execution_target_id`.

### 3) Create a PAT for Cursor

Call the Supabase Edge Function `pats-create` (requires a Supabase user session JWT):
- Endpoint: `.../functions/v1/pats-create`
- Response includes a `token` that is shown once.

Store the raw token securely. Only the SHA-256 hash is stored in `kwilt_pats`.

### 4) Configure Cursor MCP

In Cursor MCP settings:
- Transport: **Streamable HTTP**
- URL: `.../functions/v1/kwilt-mcp`
- Header: `Authorization: Bearer <KWILT_PAT>`

## Handing off a task to Cursor

Tasks are considered “handed off” only when there is a row in `kwilt_activity_handoffs` with:
- `owner_id = <user>`
- `activity_id = <activity-id>`
- `execution_target_id = <installed target id>`
- `handed_off = true`
- `status = READY`
- plus Work Packet fields populated (acceptance criteria + verification steps required)

Notes:
- In this repo, Activities are stored as JSON blobs in `kwilt_activities.data`.
- Handoff metadata is stored separately (do not parse Activity notes for requirements in v1).

## The canonical Operator Prompt (paste into Cursor)

“Identify the execution target for this repo. Fetch tasks explicitly handed off for that target. Execute sequentially. If acceptance criteria or verification steps are missing, ask 1–3 questions and mark BLOCKED. Post progress and small artifacts. Mark DONE only when verified.”

## Artifacts (keep small)

Use `kwilt.attach_artifact` (or `kwilt.post_progress` with `artifacts`) for:
- `diff_summary`
- `file_list`
- `commands_run`
- `pr_url`
- `commit_hash`
- `notes`




