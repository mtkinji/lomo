# Activity Assignment Dependency

## Correction to the Screen Time concept

The Family Screen Time exploration has been treating an assigned household Activity as if it were a narrow extension of today's To-dos. It is not.

Today an Activity:

- has no household scope, creator, assignee, or completion authority in its domain contract;
- is stored and synced under one authenticated `user_id`;
- is protected by owner-only row-level security; and
- cannot be made visible to a dependent child profile that has no authenticated Kwilt account.

The existing `kwilt_memberships` model does not close this gap. It governs collaboration on a Goal and is explicitly constrained to `entity_type = 'goal'`. Goal collaboration and household authority should remain separate.

Therefore a Screen Time rule cannot safely reference “Riley's homework” until Kwilt has a real model for household participation in Activities. Adding only `assigneeId` to the Activity JSON would create ambiguous privacy, authority, sync, recurrence, and removal behavior.

## Phase 0: yes, and

Original idea: let a family member assign a Kwilt To-do to another family member.

That could also let a family:

1. Hand off an errand without losing who requested it or why it matters.
2. Give a dependent child a useful Kwilt experience without exposing an adult's private To-dos.
3. See household responsibilities in one calm shared context while preserving personal lists.
4. Let a person claim an unassigned household responsibility instead of requiring every task to be commanded by someone else.
5. Support recurring rotations later without building a separate chores universe.
6. Let Screen Time, reminders, and future family capabilities subscribe to the same completion truth.

This elevates the frame from **chores as Screen Time criteria** to **household participation in ordinary Activities**. It directly addresses Maya's weakly served “schedule or hand off” and “family participation” steps without turning Kwilt into household project management.

## Phase 1: frame

- Audience: `audience-aspirational-family-organizers`
- Representative persona: Maya
- Hero JTBD: `jtbd-move-the-few-things-that-matter`
- Active supporting jobs: `jtbd-carry-intentions-into-action`, `jtbd-invite-the-right-people-in`, and `jtbd-trust-this-app-with-my-life`
- Underserved job-flow steps: **Schedule or hand off** (2/4) and **Family participation** (2/4)

Restated in user voice:

> When something in family life needs to get done by someone other than me, I want to hand it to the right person without exposing my private life or creating a system everyone has to administer, so our shared intentions turn into trusted follow-through.

```yaml
serves:
  - jtbd-carry-intentions-into-action
  - jtbd-invite-the-right-people-in
  - jtbd-trust-this-app-with-my-life
```

Aspirational design challenge:

> How might we let Maya's family hand ordinary work to one another with clear ownership and privacy, while keeping capture personal by default and participation lighter than project management?

## Phase 2: alternatives

### A. Screen Time-local responsibilities

The rule composer creates a small responsibility record owned only by Screen Time.

- Strength: smallest Screen Time implementation.
- Failure: duplicates Activities, creates two completion truths, and cannot help with errands or family handoffs outside Screen Time.
- Verdict: reject.

### B. Share a personal Activity with an assignee

An Activity remains owned by its creator and gains a nullable `assignedTo` field.

- Strength: superficially small schema and UI change.
- Failure: assignment implicitly shares a personal object; edit, completion, recurrence, removal, and RLS authority remain unclear. A dependent child may not have an auth user ID.
- Verdict: reject as the domain model, even if it is tempting as a shortcut.

### C. Assignment creates household participation

Activities remain the atomic unit of doing. An Activity with no other assignee is personal. Choosing a household member in **Who's doing this?** is the deliberate action that makes that Activity visible to the assignee and governed by household participation rules. The family does not separately choose a personal/household scope.

- Strength: one canonical Activity truth, one understandable sharing action, useful beyond Screen Time, and compatible with dependent profiles.
- Cost: new household data, authorization, offline sync, and role-aware To-do surfaces.
- Verdict: preferred foundation.

### D. Shared household queue with claiming

Household Activities are initially unassigned and family members claim them.

- Strength: collaborative rather than command-oriented; useful for “someone please do this.”
- Cost: does not cover homework or a responsibility that must belong to a particular child; adds claim/release conflicts.
- Verdict: valuable later behavior on top of C, not the first foundation.

All viable alternatives keep Activities as the atomic unit, preserve unblocked personal capture, and avoid scores, streaks, leaderboards, or a household dashboard.

## Phase 3: converged direction

Make **assignment the visible sharing model**, then let Family Screen Time reference assigned Activity occurrences.

The simple product rule is:

> **Not assigned to someone else means private. Assigning it to a household member shares that Activity with them.**

Kwilt does not need to expose a separate scope control. Internally, however, it still needs enough relationship data to authorize and synchronize the shared Activity safely. That state can be derived when an assignee is added.

The minimum conceptual contract is:

```text
Activity
├── createdByMemberId
├── assignedToMemberId: absent means personal
├── householdId: derived/recorded when assigned to another member
├── completionPolicy: assignee_can_complete | caregiver_review
└── visibility/edit policy derived from household role and participation
```

Assignment must target a **household member/profile ID**, not only an authenticated user ID. That permits a dependent child profile to participate before or without having a standalone login.

The fields represent different facts and must not collapse into a generic owner:

- **Creator** — who captured or requested the Activity.
- **Assignee** — who is expected to do it.
- **Editor/reassigner** — who may change the commitment.
- **Completer** — who may mark the current occurrence done.
- **Reviewer** — whether a caregiver must confirm completion.

For adults, assignment should feel like a handoff, not a command. Acceptance or a household preference may eventually be appropriate. For a dependent child, a caregiver may directly assign within household authority. The persistence model should support both even if the first UI tests only caregiver-to-child assignment.

## Product behavior

### Capture stays personal by default

Quick Add and ordinary To-do creation continue to create a private Activity. **Me** is implied by the absence of another assignee; Kwilt should not add an assignment decision to every capture interaction.

Assignment appears only when the user deliberately chooses **Who's doing this?** and selects another household member. That choice is the privacy transition. Kwilt plainly explains that the selected person will now see the Activity; it does not ask the user to understand or choose a separate household scope.

Removing an assignee returns the Activity to its creator's private list and removes the former assignee's access, while retaining an auditable completion history. If the Activity is referenced by Screen Time or another household agreement, Kwilt must explain and resolve that dependency before the unassignment takes effect.

### To-dos remain the canonical home

- A child sees household Activities assigned to them alongside their own relevant To-dos.
- A caregiver can see household Activities they are authorized to coordinate.
- Household membership does not reveal anyone's personal Activities.
- Screen Time links to the Activity occurrence and consumes its completion state; it does not own or edit the responsibility.

### Recurrence belongs to Activity occurrences

A repeating household Activity needs a stable series and dated occurrences. Reassignment must say whether it affects only today or future occurrences. Completing today's occurrence must not permanently satisfy tomorrow's Screen Time condition.

### Offline is part of the domain contract

The assigned person's device must receive authorized household Activity occurrences in advance, accept an allowed completion locally, and sync an idempotent event later. Server reconciliation must retain actor, occurrence, policy version, and resolution when two devices edit or complete the same item offline.

## Role and privacy rules to prove

1. Household roles and Activity participation are separate. A caregiver role grants coordination authority only within its declared household scope.
2. A child can read Activities assigned to them, but not a caregiver's personal To-dos or unrelated household administration.
3. Assignment does not automatically grant access to the Activity's linked private Goal or Arc. Shared context must be deliberately safe or omitted.
4. Removing a member freezes or reassigns their household Activities explicitly; it never silently converts them into another person's private data.
5. Activity completion and caregiver review are append-only actor events so offline conflict resolution and Screen Time decisions are explainable.

## Consequence for the learning release

Family Screen Time should now be treated as two linked, independently valuable slices:

1. **Household participation:** create one household Activity, assign it to one dependent child, show it on the child's device, complete it online/offline, and sync trustworthy occurrence state.
2. **Family access rule:** reference that occurrence alongside the time window and usage cap, then prove device enforcement and acknowledgment.

The second slice may be tested immediately after the first, but it should not conceal the first inside Screen Time plumbing. If household assignment is not valuable and understandable on its own, chore-gated Screen Time is built on the wrong product foundation.

## Stated bet

> We are betting that families want a small number of ordinary Kwilt Activities to become explicit household handoffs, and that this shared completion truth can power Screen Time without exposing private To-dos or creating a separate chores economy.
