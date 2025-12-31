## Shared Goals Feature Spec

### Overview

Enable users to create and pursue **shared goals** with one or more other app users. A shared goal is a goal object that is co-owned: everyone sees the same outcome, milestones, and shared activity, while optionally having their own personal sub-actions. This feature should fit cleanly into the existing **app shell** (global nav, margins, primary layout) and reuse the existing **goal canvas** pattern (goal detail view) with additional shared context.

This doc is intentionally high level so the feature can be implemented in a future iteration without locking in specific APIs or storage details.

> **Status / scope note (Dec 2025)**: This doc is a broad, long-term concept spec.
> The **canonical v1 implementation spec** for “Shared Goals + Auth + signals-only social mechanics” is:
> - `docs/prds/social-goals-auth-prd.md`
>
> If you see differences, treat this doc as “future expansion ideas” and keep v1 aligned to the PRD above.

---

### Goals & Rationale

- **Increase goal completion and engagement**
  - Social accountability makes it harder to quietly drop goals.
  - Emotional support and encouragement make it easier to persist through friction.
- **Support collaborative goals**
  - Many real-world goals are inherently shared (fitness, finance, home projects, learning).
  - Provide a lightweight alternative to “team tools” that’s tuned for personal life goals.
- **Stay aligned with existing UX architecture**
  - Preserve the **app shell**: primary nav, global layout, and overall mental model stay the same.
  - Extend the **goal canvas** to support shared context rather than inventing a separate product.

Success looks like:

- Users can create, join, and leave shared goals with minimal friction.
- Shared goals drive higher check-in rates, more completed actions, and higher subjective motivation.
- The feature feels like a natural extension of the existing goals system, not a separate “mode.”

---

### Primary User Stories

- **US1 – Create a shared goal from scratch**
  - As a user, I can create a new goal and mark it as **shared**, inviting another person to co-own it from the start.

- **US2 – Convert an existing personal goal into a shared goal**
  - As a user, I can take an existing personal goal and invite another person to join as a co-owner, while choosing how much of my past history they can see.

- **US3 – See which goals are shared vs personal**
  - As a user, I can easily distinguish shared goals from personal ones in the goals list (e.g., avatars and a “Shared” pill).

- **US4 – Co-own a shared goal**
  - As a user, when I open a shared goal, I see:
    - Shared outcome, milestones, and shared tasks.
    - Which other people are in the goal and their presence/last active time.
    - An activity feed of what each of us has done.

- **US5 – Track my own actions inside a shared goal**
  - As a user, I can see and manage **my personal actions/notes** that are anchored to the shared goal but may be private to me.

- **US6 – Coordinate and check in**
  - As a user, I can check in on a shared goal (simple daily/weekly check-in) and see my partner’s check-ins and reactions.

- **US7 – Manage membership and boundaries**
  - As a user, I can:
    - Leave a shared goal (with option to keep a personal copy).
    - Adjust whether my notes and certain actions are private or shared.

---

### UX Overview (Aligned with App Shell & Goal Canvas)

#### Entry Points

- **Goals screen (list view)**
  - Add a way to start a shared goal:
    - “New Goal” → include a **“Shared goal”** toggle or secondary action (“New Shared Goal”).
  - Shared goals in the list:
    - Show a **Shared** badge/pill and a small cluster of participant avatars.
    - Optionally support filtering or grouping:
      - Tabs or filters: **“All”**, **“My Goals”**, **“Shared”**.

- **Goal detail canvas (existing goal view)**
  - Add an action like **“Invite someone to this goal”** in the header or actions menu.
  - When the goal is shared, the header shows:
    - Goal title + status.
    - Participant avatars with presence indicators.
    - A “Shared” label or “With [names]”.

#### Shared Goal Canvas Structure

Leverage the existing goal detail canvas as the main surface, and extend it with shared-specific blocks:

- **Header**
  - Title, status.
  - Avatars of participants (with presence / last active).
  - A **Shared** pill or “With [N people]”.

- **Our Outcome (Shared)**
  - Single shared definition of success:
    - Description (“What are we trying to achieve together?”).
    - Optional quantitative targets (e.g., amount, dates, counts).
    - Target date / timeframe.

- **Plan & Milestones (Shared)**
  - Shared milestones and key steps visible to all.
  - Shared tasks/actions that either participant can complete.

- **My Actions vs Shared Actions**
  - UX pattern options:
    - Tabs / segmented control:
      - “Shared plan” (shared tasks and milestones).
      - “My actions” (my personal tasks/notes attached to this shared goal).
    - Or a merged list with clear labels:
      - Shared items vs “Private to me” items.

- **Activity Feed**
  - Stream of important events:
    - Join/leave events.
    - **Explicit check-ins** (“signals-only”).
    - Cheers / lightweight reactions.
  - v1 explicitly does **not** share activity titles/notes by default (signals-only contract).

- **Notes & Resources**
  - Shared notes area for both participants to add:
    - Links, resources, learnings.
    - Optional pinning of important items.
  - Later extension: allow private notes within the same goal, visible only to the author.

#### Invitation Flow

- From a personal goal:
  - User taps **“Share goal”** (single entry point in the Goal detail canvas).
  - v1 uses **link-based invites** (auth-backed):
    - Buddy invite: `max_uses=1`
    - Squad invite: `max_uses=5`
    - TTL: `expires_at=14 days`
  - Auth is **intent-gated**: if the user is signed out, we prompt for Apple/Google **only because** they’re initiating a share/invite.
  - Show a **pending state**:
    - Banner or inline notice: “Waiting for [Name] to join. They’ll see this goal once they accept.”
  - Once the invite is accepted:
    - Goal becomes marked as shared.
    - Participant avatars visible in header and list.

- From a new goal:
  - During creation, user toggles **“Shared goal”**.
  - They can add at least one other participant before completing setup, or skip and invite later.

---

### Data Model Sketch (High-Level, Implementation-Agnostic)

(This is intentionally not a full schema; it’s a conceptual model to inform future implementation.)

- **Goal**
  - `id`
  - `title`
  - `isShared: boolean`
  - `ownerId` (for initial creator; may or may not map to permissions)
  - `participantIds: UserId[]` (includes owner)
  - `outcome` (description, optional metrics)
  - `targetDate` / timeframe
  - `createdAt`, `updatedAt`

- **SharedGoalMembership**
  - `goalId`
  - `userId`
  - `role` (e.g., OWNER, CO_OWNER, COLLABORATOR — start with co-owner only)
  - `joinedAt`
  - `leftAt` (nullable)

- **GoalTask / Milestone**
  - `id`
  - `goalId`
  - `title`
  - `description`
  - `type` (MILESTONE vs TASK)
  - `isShared: boolean` (shared vs “private to me”)
  - `createdBy`
  - `assignees: UserId[]` (optional)
  - `status` (e.g., TODO, IN_PROGRESS, DONE)
  - `dueDate` (optional)

- **GoalActivity**
  - `id`
  - `goalId`
  - `actorId`
  - `type` (TASK_COMPLETED, CHECK_IN, NOTE_ADDED, MEMBER_JOINED, etc.)
  - `payload` (type-specific metadata)
  - `createdAt`

These conceptual entities should integrate with the existing domain model for goals/arcs without breaking current single-user goals. Shared goals could be an extension flag and related collections rather than a distinct entity type.

---

### AI / Agent Integration (Future)

These pieces do not need to be implemented in the first version but should be considered to avoid painting the architecture into a corner:

- **Shared Planning**
  - Given 2+ users, the AI can suggest:
    - Fair division of tasks based on preferences/skills.
    - Weekly plans that allocate actions to each participant.

- **Progress and Relationship Health Check**
  - On a weekly cadence, the AI can:
    - Summarize joint progress.
    - Surface prompts like “What helped each of you this week?”.
    - Suggest small experiments when progress stalls (e.g., change meeting cadence, reduce scope).

- **Nudging and Gentle Reminders**
  - Allow one participant to send an AI-assisted “gentle nudge” when the other has been inactive, with language that reduces shame and encourages collaboration.

---

### Phased Rollout Plan

**Phase 1 – Core Shared Goals**

- 1:1 shared goals only.
- Shared goal flag + participants.
- Invite flow from new and existing goals.
- Shared goal list treatments (avatars, “Shared” pill).
- Shared outcome + shared milestones/tasks.
- Basic activity feed (completed tasks, joins, check-ins).

**Phase 2 – Depth & Personalization**

- My vs shared actions (private vs shared tasks and notes).
- Lightweight daily/weekly check-ins.
- Simple reactions in the activity feed.
- Basic AI suggestions for shared weekly plans and end-of-week reflections.

**Phase 3 – Social & Groups**

- Small group goals (3–5+ participants).
- Templates for common shared goals (fitness, budgeting, learning).
- Deeper AI for conflict support, progress analysis across participants, and recommended adjustments.

---

### Open Questions & Design Decisions

These should be clarified before implementation:

- **Identity & invitations**
  - v1 uses **auth-backed link invites** (no handles/email search, no friends graph).
  - Invites are constrained by expiry + max uses; permissions are role-based via memberships (start with `co_owner`).

- **Privacy defaults**
  - v1 default is **signals-only** (check-ins + cheers). Activity titles/notes stay private unless explicitly shared in a later phase.

- **Ownership and permissions**
  - Are all participants co-owners, or is there a “primary owner”?
  - Who can archive, delete, or significantly change a shared goal?

- **History visibility when converting a personal goal**
  - If I convert an existing personal goal to shared:
    - Do I get the option to share the full history, or only from the moment it becomes shared?

- **Notifications**
  - What events generate notifications (check-ins, completed milestones, nudges)?
  - How do we avoid notification fatigue while preserving accountability?

For v1 answers and the build plan, see `docs/prds/social-goals-auth-prd.md`.


