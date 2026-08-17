# Diverge: Chores Capability

## Fixed frame

Chores should be a child-simple family responsibility capability. A child should be able to answer **“What is mine today?”** and act without understanding adult To-dos. A caregiver should be able to establish and trust the household rhythm with less work than their current reminders, lists, or conversations.

Activity reuse is a hypothesis. It wins only if its complexity can remain behind a clean capability boundary.

## Axis of variation

The alternatives vary along two connected axes:

1. **Domain ownership:** Activities own chore truth, Chores owns chore truth, or Household owns a shared rhythm.
2. **Primary interaction:** individual daily list, concrete responsibility cards, or family-wide handoff moment.

These are materially different product systems, not three visual treatments of one list.

## Alternative A: Chores Lens

### Sketch

Chores is a standalone, role-aware capability that presents a deliberately small view over recurring Activities. The child opens Chores and sees a short **Today** stack: icon or photo, plain title, optional “before dinner” context, and one large completion action. **Need help** is the only secondary action. There are no filters, priorities, projects, Goals, Arcs, scheduling controls, or recurrence editors.

A caregiver enters the same capability and sees **Today** first, then a restrained **Rhythm** area for creating and adjusting recurring responsibilities. The creation flow asks only: what needs care, who is responsible, and when it normally happens. Internally this creates an assigned repeating Activity and dated occurrences. Advanced Activity behavior remains available only through an explicit adult-only “Open in To-dos” path.

### Audience and persona fit

This fits Maya when she wants the family to adopt a familiar, concrete capability without requiring her to learn a new system. It gives the child a much smaller experience while letting Maya retain Plan and To-dos interoperability when useful.

### Design-challenge answer

It reduces reminding by turning existing Activity recurrence and completion into a child-legible daily contract. Privacy follows Household grants and assignment; child dignity comes from trusted completion and a help path rather than proof or supervision.

### System fit

- Constraint posture: extends the current system while reusing its four-object model.
- Objects touched: Activity remains the atomic unit of doing; Chores is a capability-owned projection and policy layer.
- Existing surfaces reused: Activity recurrence, completion, scheduling, Household roles/grants, and child activation.
- Smallest required extension: household Activity assignment, dated occurrence identity, child-scoped synchronization, and Chores-specific projection rules.
- Capture-first stance: caregiver can add a responsibility without choosing an Arc, Goal, priority, or full schedule; optional enrichment can happen later.
- Migration/data risk: moderate. Existing Activities can remain unchanged, but recurring completion semantics and household authorization must become much more rigorous.

### Best when

- Existing Activity recurrence can produce stable dated occurrences.
- Chores-specific defaults can be stored without making general Activities harder to understand.
- The team values interoperability with To-dos, Plan, notifications, and later Screen Time references.

### Fails when

- Adult Activity fields leak into child or caregiver setup.
- Assignment and rotation require so many Activity exceptions that Chores becomes a facade over an awkward model.
- Completing or editing one occurrence produces surprising changes elsewhere in To-dos.

### Primer anti-pattern check

Passes if Chores stays a calm capability projection. It must not require Goal/Arc attachment, show productivity controls, use overdue shame, expose Force scoring, or turn the child surface into an Activity-management screen.

## Alternative B: Responsibility Cards

### Sketch

Chores owns a deliberately narrow **Responsibility** model rather than using Activity as its source of truth. A responsibility is not a generic task: it has a name, optional visual cue or short instruction, one responsible person or a simple rotation, a recurrence rhythm, a completion policy, and generated daily occurrences. That is the whole model.

The child sees concrete cards under **Now**, **Later**, and **All cared for**. A card can be completed or marked **Need help**. The caregiver creates responsibilities from a compact gallery of household patterns or from scratch, then sees only exceptions that need attention. If a responsibility needs planning context, the adult may explicitly link or mirror its next occurrence into Plan, but Chores never exposes the broader Activity object.

### Audience and persona fit

This fits Maya if Activities are structurally too broad and the family needs a model whose defaults and language are designed around recurring household care from the start. It is the strongest option for young-child comprehension and predictable rotations.

### Design-challenge answer

It lowers administration by refusing general-purpose task semantics. The system knows exactly what a household responsibility is, can explain today's instance plainly, and can treat help, rotation, and review as first-class behavior rather than Activity exceptions.

### System fit

- Constraint posture: bends the four-object model by introducing a capability-owned doing object adjacent to Activity.
- Objects touched: Responsibility becomes the canonical Chores object; an occurrence is its completion unit. Activity becomes an optional adult planning projection, not the source.
- Existing surfaces reused: Household roles/grants, common UI primitives, notifications, and possibly Plan adapters.
- Smallest required extension: new responsibility, recurrence, occurrence, assignment/rotation, completion, and sync contracts plus an explicit bridge to Activity/Plan where needed.
- Capture-first stance: a caregiver can create a responsibility with only a name; person and rhythm can be added immediately or later. The child never faces taxonomy decisions.
- Migration/data risk: high. It creates a second kind of forward-looking work and must prevent duplicate truth between Responsibilities and Activities.

### Best when

- Real household use proves that rotations, trusted completion, help states, or review policies fight the Activity model.
- The product needs child-specific semantics more than universal task interoperability.
- The Chores capability is valuable enough to justify a new canonical object.

### Fails when

- Adults frequently need the same item in To-dos and Chores and cannot tell which copy is authoritative.
- Plan, Chat, notifications, and Screen Time require parallel integrations for both Activities and Responsibilities.
- The narrow object gradually absorbs general scheduling and becomes Activities under another name.

### Primer anti-pattern check

This intentionally challenges the four-object model, so it needs a higher burden of proof. It passes only if the new object stays sharply bounded to shared recurring household responsibility and does not become a second personal task system. No progress scores, streaks, rankings, or forced Goal/Arc alignment.

## Alternative C: Household Rhythm

### Sketch

Chores is not primarily a set of individually authored tasks. It is a shared, time-shaped household rhythm: **Morning**, **After school**, **Dinner**, and **Reset for tomorrow**. Each rhythm contains a few responsibilities that may be fixed, claimed, or rotated. The child opens to the current rhythm and sees their part; the caregiver sees the same moment from a coordination perspective rather than maintaining separate lists.

Completion changes the shared moment quietly: a responsibility moves to cared for, a blocked item shows who asked for help, and the rhythm settles when nothing remains. The product emphasizes the state of the home—“Kitchen is ready for tomorrow”—over individual performance. Behind the surface, the model could use Activities or a Chores-owned responsibility substrate, but the experience is organized around household moments rather than objects.

### Audience and persona fit

This fits Maya when the real burden is transitions and repeated family moments, not task storage. It can feel more natural to younger children because it answers “What happens now?” rather than presenting a list they must manage.

### Design-challenge answer

It replaces repeated prompting at predictable moments with one shared, legible family rhythm. It preserves dignity by showing contribution to the household outcome, not a scoreboard of individual compliance.

### System fit

- Constraint posture: questions the current object-first presentation while potentially preserving Activity underneath.
- Objects touched: household rhythm is a capability-owned grouping/context; responsibilities or Activities remain atomic completion units.
- Existing surfaces reused: Household, scheduled dates/times, assigned work, and common child/caregiver projections.
- Smallest required extension: named rhythms, membership rules, ordering, current-rhythm resolution, and either assignment or claim/rotation semantics.
- Capture-first stance: Maya may quickly add an item to the current rhythm without fully configuring it; Kwilt can ask about repetition afterward.
- Migration/data risk: medium to high. A rhythm is a new durable organizing concept and could duplicate Plan, custom views, or Activity Areas if its boundary is weak.

### Best when

- Household responsibilities cluster around predictable transitions.
- Family members coordinate by context—morning, after school, bedtime—more naturally than by due dates.
- Shared completion feels motivating without rewards or surveillance.

### Fails when

- Responsibilities are mostly independent, irregular, or individual.
- Maya must maintain rhythm membership and ordering as another configuration layer.
- The surface becomes a household dashboard or recreates Plan with different labels.

### Primer anti-pattern check

Passes if the rhythm is a calm current-moment surface with no completion percentages, family score, streak, or punitive overdue treatment. “All cared for” describes household state; it must never imply a person's worth or performance.

## Alternative D: Contextual Handoff

### Sketch

Chores has no permanent management home at first. It appears contextually where each person already is: a child receives a compact **Your responsibilities today** section in their Home experience; a caregiver creates or hands off a responsibility from Quick Add, a member's Household page, or Chat; exceptions return to the responsible caregiver through Home. A lightweight Chores destination appears only after the household has enough active responsibilities to need one.

The product teaches itself through actual handoff. Maya can say or type “Charlie feeds Scout every morning,” review a simple proposal, and send it. Charlie sees the resulting responsibility without navigating adult To-dos. The system can begin Activity-backed and delay the broader Chores information architecture until real use reveals what needs a dedicated home.

### Audience and persona fit

This fits Maya if creating a capability destination would be premature or if family adoption depends on responsibilities arriving naturally in each person's existing context. It has the lowest initial conceptual burden.

### Design-challenge answer

It reduces reminding by making the handoff explicit and delivering the next responsibility directly to the right person. The capability grows only when actual household use earns more structure.

### System fit

- Constraint posture: fits the existing system and postpones a new top-level destination.
- Objects touched: initially Activity plus household responsibility metadata; Chores is a cross-surface interaction contract.
- Existing surfaces reused: Quick Add, Chat proposals/receipts, Household member pages, Home receiving projections, and Activity completion.
- Smallest required extension: assignment, recurrence occurrence truth, child projection, and Chores-aware proposals/receipts.
- Capture-first stance: strongest of the four—natural language or Quick Add can capture before detailed recurrence is resolved, with review before household delivery.
- Migration/data risk: low to moderate initially, but navigation and ownership can become fragmented if the capability grows without a clear source surface.

### Best when

- The goal is to learn from a narrow real handoff before committing to a Chores model or destination.
- Family members already use Home, Household, or Chat reliably.
- Most responsibilities can be created and understood in context.

### Fails when

- Children cannot reliably find today's work.
- Caregivers cannot inspect or adjust the recurring rhythm from one obvious place.
- Cross-surface fragments make Chores feel hidden, inconsistent, or dependent on AI.

### Primer anti-pattern check

Passes if Chat remains proposal-and-approval based, deterministic behavior does not depend on anthropomorphic AI, and a child always has a non-Chat path to current responsibilities. It fails if discoverability is sacrificed merely to avoid adding a capability surface.

## Cross-alternative pressure tests

Each alternative must eventually demonstrate all of the following with the same realistic household scenarios:

1. Maya creates “Feed Scout every morning” without encountering adult To-do configuration.
2. A child can find and complete today's occurrence without caregiver help.
3. Tomorrow's occurrence remains intact and understandable.
4. The child can ask for help without being marked as failing.
5. A caregiver can change today without accidentally changing the whole series, and can change the series intentionally.
6. The same responsibility does not appear as conflicting truth across Chores, To-dos, Plan, Home, or Screen Time.
7. A household with no active Chores receives no empty capability noise.
8. Offline completion eventually reconciles with actor and occurrence truth intact.

## What divergence clarified

- **Chores Lens** is the best test of the Activity-backed hypothesis.
- **Responsibility Cards** is the clean escape hatch if Activity semantics make the experience complicated.
- **Household Rhythm** is the most distinctive product idea, but it risks introducing a new organizing system.
- **Contextual Handoff** is the smallest learning path, but it may under-serve child discoverability and caregiver trust.

No option earns convergence merely because it reuses more code. The winner must remove mental load at both ends of the relationship: simple enough for the child to act, simple enough for the caregiver to stop carrying it.

## User evidence after divergence

Andrew described the household's current operating behavior:

- Chores live in a shared list rather than being assigned in advance.
- Any family member may choose and complete available chores.
- In summer, a child must complete at least two chores on each day they want Screen Time.
- During the school year, a child must complete at least twelve chores before Screen Time can be unlocked on Friday night or Saturday.

This evidence rejects **Chores Lens** as the canonical model. Activity assignment and dated personal occurrences are the wrong center. It also sharpens **Responsibility Cards**: the Chores-owned object should represent an available household contribution, and completion should be an attributed event against an explicit eligibility window. **Household Rhythm** remains useful as presentation, while **Contextual Handoff** becomes secondary because the core behavior is self-selection rather than handoff.

The threshold is factual family-policy state, not generic gamification. Kwilt should show the child's understandable progress toward the current agreement, but it should not translate chores into points, money, spendable credits, or a minute-per-chore balance.
