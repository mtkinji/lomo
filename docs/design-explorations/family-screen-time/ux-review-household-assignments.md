# UX Review: Household Assignment in To-dos

## Decision summary

Assignment belongs on the Activity model, but it should not become permanent chrome across To-dos.

The recommended experience has three progressive states:

1. **No Household:** To-dos is visually and behaviorally unchanged. There is no assignee field, `Me` label, people filter, or family setup promotion in capture.
2. **Household, no assignment yet:** An eligible user can find **Who's doing this?** in Activity detail and family-context creation flows. Quick Add and ordinary list rows remain unchanged.
3. **Assignment in use:** Assigned items show a restrained person marker; **Assigned to me** appears only after it contains something; the expanded composer may remember an assignment shortcut only after repeated use.

Household eligibility controls whether assignment is possible. Actual assignment state controls whether assignment UI consumes everyday attention.

## What I see

### The existing surface

Kwilt's current To-dos experience already carries substantial individual planning behavior:

- Quick Add prioritizes immediate capture and optional AI actions.
- Activity detail holds steps, reminders, dates, recurrence, estimates, difficulty, notes, tags, Goal/Arc context, location, and other planning metadata.
- List rows balance completion, title, dates, estimate, priority, focus, planning, and deletion gestures.
- Filters, grouping, views, Kanban, Plan, and contextual navigation already compete for conceptual space.

Adding a visible `Assignee: Me` row, avatar on every item, assignee filter, or person chip in Quick Add would make the entire product feel collaborative even for a person who never asked for collaboration. It would also weaken capture-first behavior by implying that “who” is a decision required to create an Activity.

### Strongest failure risks

1. **Structural/architectural:** assignment becomes a global To-dos mode instead of a capability unlocked by a real household relationship.
2. **Sender/recipient context:** “assigned” can feel managerial or coercive inside a family unless Kwilt distinguishes who requested the work, who is doing it, and what the recipient may do.
3. **Scannability:** persistent avatars and `Me` metadata would compete with the current next-action signals on every row.
4. **Privacy comprehension:** if assignment appears before Household is established, people may reasonably wonder whether their other To-dos are visible.

## The anchor in play

Primary audience: `audience-aspirational-family-organizers`, represented by Maya.

Active jobs:

- `jtbd-carry-intentions-into-action`
- `jtbd-invite-the-right-people-in`
- `jtbd-trust-this-app-with-my-life`

Underserved job-flow steps:

- **Schedule or hand off:** 2/5
- **Family participation:** 2/5
- **Know the next doable action:** 2/5

Anchor-derived design principle:

> To-dos should remain a private, low-friction place to act until the user deliberately involves another household member; then Kwilt should reveal exactly enough relationship context to make the handoff clear and safe.

That implies two hard rules:

- Household membership alone must not visually or behaviorally convert personal To-dos into a family workspace.
- Assignment shares one Activity; it never creates ambient visibility into a person's list, Goal, Arc, or workload.

## References worth knowing

### Apple Reminders — assignment only in a shared list

Apple permits assignment only after the reminder list has been shared. An **Assigned to Me** smart list aggregates assigned reminders and can be hidden.

- What translates: no shared context, no assignment UI; assignment evidence appears only where meaningful.
- What not to copy: requiring a whole list to be shared before one responsibility can be handed off. Kwilt's Household can establish the people boundary while item assignment shares only the selected Activity.
- Sources: [Share and assign reminders](https://support.apple.com/en-gb/105124), [Assigned to Me](https://support.apple.com/guide/iphone/about-the-assigned-to-me-list-apd7741f383d/ios)

### Microsoft To Do — detail-level assignment in shared lists

Microsoft exposes **Assign to** in a shared task's detail view and automatically offers an **Assigned to you** smart list, which can be disabled or hidden. Moving an assigned task out of its shared context removes the assignment.

- What translates: put first assignment in detail, not in the default capture path; make the aggregate view conditional and dismissible.
- What not to copy: list-sharing ownership as the only privacy model. Kwilt is proposing item-level sharing inside a pre-established Household.
- Sources: [Assign tasks in shared lists](https://support.microsoft.com/en-US/ToDo/assign-tasks-in-shared-lists), [Share a task list](https://support.microsoft.com/en-us/office/share-a-task-list-4140ef50-a755-4114-a002-4b8d69fa706c)

### Todoist — assignments only in shared projects

Todoist restricts assignees to members of the shared project and uses one directly responsible person. Personal projects can be shared with family/friends, while personal workspace content remains distinct from team work.

- What translates: one assignee keeps responsibility legible; people outside the authorized container are not offered.
- What not to copy: project/workspace language, team workload views, and managerial dashboards. A household is not a small company.
- Sources: [Collaborate with friends or family](https://www.todoist.com/help/articles/collaborate-with-friends-or-family-in-todoist-tzkGUy), [Work with others](https://www.todoist.com/help/articles/work-with-others-in-todoist-WOpFVjup7)

### Established pattern

The durable industry pattern is:

```text
private task context
  -> establish a shared people boundary
  -> expose assignment within that boundary
  -> aggregate assigned work only after it exists
```

Kwilt should follow that disclosure sequence while making its sharing unit smaller: one Activity rather than one entire list or project.

## Three sketches

### Direction A — Universal assignee field

Every Activity shows **Who: Me**. Quick Add includes a person control, Activity detail always includes an assignee row, list rows reserve avatar space, and filters always include assignee.

Anchor check: fails capture-first and makes solo users manage collaboration vocabulary they did not request.

Best when: Kwilt is primarily a team task manager.

Fails when: most people begin alone, household adoption is optional, and current To-dos already carries dense planning metadata.

Verdict: reject.

### Direction B — Household-gated progressive disclosure

Before Household setup, To-dos is unchanged. A contextual **Assign to someone...** action can start the first-person flow without requiring the user to understand Household first. After setup, **Assigned to** becomes available in Activity detail and when creating from a family-owned context such as a child rule or household responsibility flow. Quick Add stays title-first. Only actually assigned Activities gain a small person marker. **Assigned to me** appears after the first inbound assignment and auto-hides when empty.

Anchor check: passes. Personal capture stays private and fast; assignment is explicit and legible when active.

Reference grounding: Apple, Microsoft, and Todoist all gate assignment behind shared eligibility and surface an assigned aggregate only when useful.

Best when: Household is an optional Kwilt capability and ordinary personal Activities remain the dominant use case.

Fails when: families expect every capture to be delegated immediately and cannot discover detail-level assignment. That can be addressed later with a learned composer shortcut rather than permanent global chrome.

Verdict: recommend.

### Direction C — Separate Household/Chores workspace

Personal To-dos never shows assignment controls. A Household or Chores destination owns family creation, assignee selection, responsibility lists, and child views. The underlying objects can still be Activities, but family work lives in a visibly separate projection.

Anchor check: protects personal To-dos but risks turning family life into administration and obscuring the canonical Activity home.

Reference grounding: closest to a Todoist team workspace or a shared Reminders list.

Best when: families consistently need a shared operational board with many concurrent responsibilities.

Fails when: the family wants to hand off one ordinary errand, or the same Activity should remain findable in personal Today/Plan surfaces.

Verdict: preserve as a future projection if child findability demands it; do not make it the initial creation model.

## Recommendation

Choose **Direction B: Household-gated progressive disclosure**.

We're betting that the dominant risk is not assignment complexity in the database; it is allowing optional family participation to make every solo To-do feel like work management. If assignment remains hard to discover after Household setup, the next move is a contextual setup cue or learned composer shortcut—not a permanent `Me` field.

## View ownership: responsibility, not authorship

The default To-dos experience should answer:

> **What am I responsible for?**

It should not answer:

> What Activities did I originally create, including work I handed to other people?

Therefore assigning an Activity to Charlie completes a handoff:

```text
Andrew creates “Feed the dog”
  -> it initially appears in Andrew's personal To-dos
Andrew chooses Assigned to · Charlie
  -> it leaves Andrew's personal To-dos
  -> it appears in Charlie's assigned To-dos
  -> it remains inspectable in Andrew's Family > Charlie view
```

The transition should be visible rather than feeling like a mysterious filter result:

> **Moved to Charlie · View**

Include a short Undo action. Removing Charlie later returns the Activity to its creator's personal To-dos unless another explicit disposition is chosen.

### Base scope is not an ordinary filter

Every existing personal system/custom view should have an implicit base scope of **Mine**. Date, status, Goal, tag, priority, and other user filters apply inside that scope.

```text
view result = authorized source scope -> responsibility scope -> user filters -> sort/group
```

Recommended view scopes:

- `mine` — private Activities created by me with no other assignee, plus Activities assigned to me.
- `member:<id>` — household Activities assigned to a named member that I am authorized to coordinate.
- `for_others` — Activities I created and assigned to someone else.
- `household` — authorized household Activities across members; available only in an explicit family context.

This scope should not be stored as a normal editable `assignee = me` filter on every view. Treating it as a filter would let users accidentally remove it, would complicate every existing view, and could confuse product filtering with authorization. Scope selects the authorized Activity population; filters organize that population.

### Existing views and migrations

- Existing system views such as All to-dos, Due today, and Past due remain scoped to **Mine**.
- Existing custom views remain scoped to **Mine**. Household setup must never cause previously saved views to absorb other people's responsibilities.
- New custom views default to **Mine**. A household-eligible user may explicitly choose a family/member scope later.
- Solo users do not see or store a meaningful choice; `mine` is implicit.
- **All to-dos** continues to mean all To-dos relevant to the current person/scope, not every authorized Activity in the household.

### Caregiver inspection

Once Andrew creates the first outbound assignment, the To-dos view menu gains a contextual family section:

```text
VIEWS
All to-dos
Due today
Past due

FAMILY
Charlie
Blaire
For others
```

Selecting Charlie opens a named scope such as **Charlie's responsibilities**. Inside it, familiar date/status controls can organize Charlie's assigned household work. It is an operational view, not Household administration and not a workload dashboard.

The view shows Activities Andrew is authorized to coordinate for Charlie. It does not imply access to a future authenticated teen's private personal To-dos. For a dependent child whose Kwilt experience currently contains only household-assigned work, Charlie and the caregiver may effectively see the same responsibility list; the privacy contract should still name the source precisely.

The same view should be reachable from:

- To-dos view menu -> Family -> Charlie;
- Screen Time -> Charlie -> Responsibilities; and
- Settings -> Household -> Charlie only as a secondary administrative deep link, not the primary daily route.

### Daily recurring chores

If Andrew assigns five daily recurring chores to Charlie:

- Andrew's personal list shows none of the five after assignment.
- Charlie sees today's five occurrences, not an infinite repeating series or future copies.
- Andrew sees today's five in **Charlie's responsibilities**.
- Series editing lives behind each Activity or a future family-routines management projection, not in Andrew's daily personal list.
- Tomorrow's occurrences become visible according to the recurrence/offline horizon without reappearing in Andrew's personal To-dos.

### Caregiver attention is a third scope

Caregiver work must not leak back into personal To-dos merely because Andrew can supervise it.

- Auto-trusted child completion updates Charlie's responsibility state quietly.
- A completion configured for caregiver review appears in **Needs your attention** within the family/child surface and may notify the caregiver.
- A Screen Time exception appears in Screen Time/family attention, not as an ordinary personal To-do.
- Device-health problems remain Screen Time state.

This preserves three distinct questions:

| Surface | Question answered |
| --- | --- |
| My To-dos | What am I responsible for? |
| Charlie's responsibilities | What is Charlie responsible for? |
| Family attention | What decision or help is required from me? |

### Why not show authored work in My To-dos?

Keeping creator-authored assignments in the creator's list would:

- fail the emotional promise of a handoff;
- create five daily duplicate-looking chores in the caregiver's working inventory;
- distort Today, Past due, widgets, recommendations, and Plan;
- tempt the caregiver to complete the child's work accidentally; and
- turn the personal list into a household monitoring feed.

Creator attribution remains important for audit, notification copy, and relationship context, but it should not determine default list membership.

### The four UI states

| User state | Quick Add | Activity detail | List rows | Navigation/views |
| --- | --- | --- | --- | --- |
| No Household | Unchanged | No assignment UI | Unchanged | No family/assignment destinations |
| Household, never assigned | Unchanged | **Who's doing this?** available in restrained details/action area | Unchanged | Household in Settings; no empty Assigned view |
| Has outbound assignment | Unchanged initially; shortcut may appear after repeated use | Shows **For Riley** and relationship actions | Assigned item leaves My To-dos; visible in named family/member scope | Family/member scopes appear in the existing Views menu |
| Has inbound assignment | Unchanged | Shows **For you · from Andrew** with allowed response/actions | Source/person marker only where needed | **Assigned to me** appears automatically and can auto-hide when empty |

### Solo-user contract

For someone who never creates a Household:

- no new field;
- no new filter;
- no `Me` avatar;
- no assignment education in onboarding;
- no change to Quick Add, Activity detail hierarchy, list density, Today, Plan, or notifications; and
- no migration choice for existing Activities.

This is stronger than merely defaulting the assignee to `Me`. The concept does not exist in their experience.

### Household activation contract

Kwilt should not create an empty Household during ordinary onboarding. A solo user should finish onboarding into their own private system without choosing a family structure they may never need.

The Household is created atomically when the owner adds or invites the first other person. The user should experience this as **adding a person**, not as a separate administrative prerequisite called **Create household**. The same flow may begin from:

- **Settings > Household > Add person**;
- **Screen Time > Set up for a child**;
- an Activity's **Assign to someone...** action; or
- a future family capability that requires another person.

Accepting an invitation joins an existing Household rather than creating another one. Apple Family Sharing may help with purchase/subscription eligibility later, but it must not silently create or populate a Kwilt Household because Apple and Kwilt roles, consent, and data access are different.

Kwilt may ask a lightweight family-intent question after personal onboarding, but skipping it creates no Household and changes no personal surfaces.

Creating or joining a Household changes only Settings/Household and the eligibility model. It should not immediately add avatars across To-dos or show a new empty navigation item.

The first assignment affordance may be introduced through one calm, contextual cue:

> You can now hand a to-do to someone in your household.

Possible placements:

- after Household setup completes;
- on the first Activity detail opened after setup; or
- when creating a Screen Time responsibility.

Show it once. Do not turn it into a persistent banner or capture interruption.

### Creation contract

#### Ordinary Quick Add

Remain unchanged for the first release. Capture the title immediately; assign later from detail.

#### Full Activity detail

For an eligible household member, add one restrained relationship row in the first compact detail/context group directly below the title-and-steps bundle and before reminders, dates, recurrence, and planning controls:

```text
Assigned to                    [avatar] You     ›
```

Once assigned:

```text
Assigned to                [avatar] Charlie     ›
```

The stable field label is **Assigned to**; its value is the member's avatar plus **You** or their name. Tapping it opens a member picker titled **Assign to** with eligible household members and the privacy explanation when needed.

This is deliberately more conventional than **For me** or **For Charlie**. **For** is warm and compact, but it can mean audience, ownership, benefit, or delivery. **Who's doing this?** is approachable as helper copy, but too prompt-like to serve as a durable data-field label. Because changing this value also changes list membership and visibility, the field should use the clearest familiar term. Warmth belongs in the surrounding confirmation and notification copy, such as **Moved to Charlie**.

Do not add a full PEOPLE section, bury assignment in the overflow menu, or place it below planning metadata. Responsibility is more fundamental than when, how long, or how difficult the Activity is because it determines whose list contains the Activity and who may act on it.

This row appears only when Household assignment is available or when the Activity is already shared. It does not appear for solo users. It stays out of Quick Add and out of unassigned list rows.

#### Family-context creation

When creation begins inside a child/household context, preselecting or requiring the relevant person is legitimate because the context already answers “why is this shared?” Examples:

- **Add responsibility for Riley** from Screen Time;
- **Add for Riley** from a child detail;
- a future Household responsibilities projection.

The resulting object remains a canonical Activity and appears in authorized To-dos views.

### List-row contract

Do not reserve a right-side avatar slot across every row.

- Personal item: unchanged.
- Assigned by me to someone else: small avatar or `For Riley` in existing metadata only when it does not displace due/next-action truth.
- Assigned to me: small source avatar/name only when sender context prevents confusion.
- Child list: omit redundant `For Riley`; show who asked only if useful.
- Screen Time-linked item: do not add a Screen Time badge to general lists unless the consequence is currently relevant.

Assignee should become an available filter/grouping field only after Household exists and at least one authorized assigned Activity exists. It should not be a default grouping.

### Navigation contract

- To-dos remains canonical.
- **Assigned to me** is a smart projection, not another object store.
- Auto-create/show it only after an inbound assignment; auto-hide when empty unless the user pins it.
- Existing personal views have an implicit **Mine** source scope; assignment to another person moves the Activity out of those views.
- Named household-member scopes appear in the existing Views menu after outbound assignment exists.
- Do not create a global **Chores** capability merely because recurring assigned Activities exist.
- For children, a simplified Today/To-dos projection may use the word **Responsibilities** or **Chores** if testing shows it is clearer. That role-specific label does not redefine the adult Activity model.

### Relationship language

Use **For** or **Who's doing this?** in the everyday interface. Reserve **assignment** for settings, help, accessibility labels, and system explanations where precision matters.

- Creator: **For Riley**
- Recipient: **For you · from Andrew**
- Change: **Choose someone else**
- Remove: **Remove Riley** followed by a consequence explanation

Avoid `Owner`, `DRI`, `delegate`, `resource`, `workload`, or `unassigned queue` in family UI.

### Adult versus child behavior

The same relationship model can present different social behavior:

#### Caregiver to dependent child

- Direct assignment is permitted within household/capability authority.
- Child can complete or request help.
- Child cannot change caregiver-only recurrence, review, or Screen Time consequence policy.

#### Adult to adult

- First release can allow direct handoff, but the recipient must be able to remove/return it without an admin intervention.
- Notification language should say **Andrew added “Pick up medicine” for you**, not **Andrew assigned you a task**.
- If dogfooding reveals resentment or ambiguity, add an `asked/accepted` state before expanding broadly. Do not force that extra state before evidence.

#### Child-created Activity

- A child may create a private/local Activity if their account/device experience supports it.
- Choosing another member or making a Screen Time-relevant responsibility requires explicit authority rules; child creation must not become a path to fabricate a satisfied access condition.

### Privacy transition

The first time a user assigns any Activity, the picker should state:

> Riley will be able to see this to-do and mark it complete. Your other To-dos stay private.

After the user understands the model, the picker can become compact. Show the explanation again when unusually sensitive or linked context would be omitted.

Do not share by default:

- linked private Goal/Arc titles;
- private notes or attachments not included in the safe Activity projection;
- surrounding list, tags, priority rationale, history, or AI context; or
- creator/household data outside the recipient's granted scope.

### Removal and dependency UX

Unassignment cannot be a silent clear button when other behavior depends on the Activity.

Simple case:

> Remove Riley? This to-do will return to your private list.

Screen Time-dependent case:

> Riley's Games rule waits for this responsibility. Choose another responsibility or remove it from the rule before removing Riley.

Household-member removal should present affected assigned Activities as a cleanup decision, not leave invisible orphan work.

## First UX proof

Prototype only these moments before accepting the Assignment brief:

1. Solo Activity detail before Household.
2. The same detail after Household but before assignment.
3. First assignment picker and privacy explanation.
4. Creator row/detail after assigning Riley.
5. Riley's assigned item and completion action.
6. Blaire receiving an adult handoff.
7. Unassignment with and without a Screen Time dependency.
8. Andrew switching between My To-dos and Charlie's five daily responsibilities.

Success signals:

- A solo user notices no change.
- A household user can find assignment without instruction after one contextual cue.
- Creator and recipient correctly explain what became visible.
- List rows remain scannable for dates and next actions.
- Andrew's personal list contains only work he is responsible for, while Charlie's list remains one tap away.
- Adult handoff does not feel like workplace task management.
- Child can name what is theirs and what happens after completion.

## Deferred

- Quick Add person tokens or persistent assignee chip.
- Multiple assignees, rotations, claiming, swaps, or capacity views.
- Household dashboard.
- Acceptance workflow for adults.
- Universal Chores navigation.
- Person-based filters before actual assigned inventory exists.
