## PRD — Arc/Goal Lifecycle + Limits (MVP Launch)

### Purpose

Implement the MVP limits in a way that avoids destructive data loss and sets up long-term lifecycle behavior:

- Free: **1 Arc total**, **3 active Goals per Arc**
- Pro: **unlimited Arcs** and higher/unlimited Goals per Arc

### References

- Launch plan: `docs/launch/mvp-app-launch-jan-1-2026.md`
- Domain types: `src/domain/types.ts`
- Store operations: `src/store/useAppStore.ts` (`removeArc`, `removeGoal`)

---

## Current state

- `Arc.status` exists in the type system (`active | paused | archived`), but **Arc pausing is not a product behavior** (we will not ship pause affordances). UX is primarily create/delete plus archive/restore.
- `removeArc` is destructive and cascades (removes goals + activities for that arc).
- `Goal.status` exists (`planned | in_progress | completed | archived`).

---

## MVP requirements

### Definitions

- Active Arc: `Arc.status === 'active'`
- Active Goal (confirmed): `Goal.status !== 'archived'`
  - Users can use **Archive** as the primary way to stop a goal counting toward the Free cap (including completed goals).

### Free limits

- **Max 1 Arc total (creation blocked beyond the first).**
  - Free users should **not** be able to create a second Arc at all (even paused/archived).
  - Attempting to create another Arc must show an **upgrade message** with an extremely easy upgrade path.
- Max 3 active goals per arc.

### UX requirements (avoid painting into a corner)

- Users must be able to manage the lifecycle of their **single free Arc** without deleting data.
  - Add “Archive arc” and “Restore arc” (non-destructive)
- Delete remains available but is clearly destructive.

---

## Implementation plan

### Arc lifecycle actions

Add Arc actions in Arc detail:

- Archive
- Restore (un-archive)
- Delete (destructive, confirm; existing behavior)

### Goal lifecycle actions

Add Goal actions in Goal detail:

- Archive goal
- Mark completed
- Reopen (completed → in_progress/planned)
- Delete (destructive, existing behavior)

### Enforcement points

- Arc creation initiation (not completion):
  - If free and **any Arc already exists**, block Arc creation and show paywall/upgrade prompt.
  - This must apply to:
    - Manual Arc creation affordances (e.g., “Create Arc” button).
    - AI Arc creation flows (upgrade message rendered inside the Agent Workspace).
- Goal creation (GoalCoachDrawer): block creating 4th active goal in an arc for free and show paywall.

### Store changes

No breaking schema changes required; use existing `status` fields.

Optional improvements (post-launch):

- Replace cascade-delete with “archive cascade” (keep data, hide from UI) to reduce accidental loss.

---

## Acceptance criteria

- Free users can archive/restore their Arc without deleting it.
- Free users are blocked from creating a second Arc (manual and AI flows both present upgrade path).
- Free users are blocked from creating a 4th active goal within a single arc.
- No destructive delete is required to continue using the app.


