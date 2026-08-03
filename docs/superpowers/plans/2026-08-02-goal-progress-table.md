# Goal To-do Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each Goal define a custom-column table view over its real To-dos, with completed To-dos retained in place.

**Architecture:** Store column definitions and the title-column choice on the Goal, store non-title custom cell values on each Activity, and keep Activity status/completion authoritative. A pure parser imports a pasted table, infers the To-do title column, reconciles existing Activities by title, and plans new Activity creation; the Goal Plan renders the same Activities as a table.

**Tech Stack:** TypeScript, React Native, Zustand domain persistence, Jest, React Native Testing Library.

---

### Task 1: Goal-owned columns and Activity-owned cell data

**Files:**

- Modify: `src/domain/types.ts`
- Create: `src/features/goals/goalTodoTable.ts`
- Create: `src/features/goals/goalTodoTable.test.ts`

- [x] **Step 1: Write parser, title-inference, reconciliation, and serialization tests**
- [x] **Step 2: Implement `Goal.todoTable`, `Activity.todoTableValues`, and the pure helpers**
- [x] **Step 3: Verify tabs, manually spaced columns, malformed rows, existing completed To-dos, and active/completed serialization**

Run: `npm test -- --runInBand src/features/goals/goalTodoTable.test.ts`

### Task 2: To-do table view and import drawer

**Files:**

- Create: `src/features/goals/GoalTodoTableSection.tsx`
- Create: `src/features/goals/GoalTodoTableSection.test.tsx`

- [x] **Step 1: Test active and completed rows in one table with Activity completion callbacks**
- [x] **Step 2: Test import planning, validation, and view removal without To-do deletion**
- [x] **Step 3: Implement the bounded three-column mobile table and paste-first editor**

Run: `npm test -- --runInBand src/features/goals/GoalTodoTableSection.test.tsx`

### Task 3: Goal Plan integration

**Files:**

- Modify: `src/features/arcs/GoalDetailScreen.tsx`
- Modify: `src/features/goals/FEATURE.md`
- Modify: `src/features/goal-partners/FEATURE.md`

- [x] **Step 1: Add Set up/Edit To-do table to Goal actions**
- [x] **Step 2: Save the Goal schema, update title-matched Activities, and create unmatched Activities**
- [x] **Step 3: Render table mode in the Plan with completed To-dos retained and Quick Add preserved**
- [x] **Step 4: Remove only the table view configuration when the user returns to list mode**

### Task 4: Completion verification

**Files:**

- Review all files changed by this plan.

- [x] **Step 1: Run focused tests, app/test typechecks, product lint, and diff checks**
- [x] **Step 2: Run `npm run verify:changed -- --run`**
- [x] **Step 3: Inspect the authenticated Simulator editor without saving user data**
- [x] **Step 4: Record that a saved real 29-row table remains an explicit user-data/runtime gate**
