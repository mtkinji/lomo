# Frame: Parent Chore Creation

## What the user said

> We're working out the chore completion flow from the kids point of view, but we also need to work out the chore creation flow from the parents point of view.
>
> I'm thinking that we may want to use our standard action dock paradigms for both direct chore creation and contextual AI chat.

## Restated in user voice

When household work needs to become part of the family's rhythm, Maya wants to capture it quickly, decide who may or must do it, and make its recurrence understandable without building a task-management system, so the responsibility can leave her head and become something the family can carry together.

## Target audience

`audience-aspirational-family-organizers`: parents who want family life to feel more organized without adopting a productivity methodology.

## Representative persona

Maya is a parent who notices household work in motion and often carries the remembering burden. She needs to establish a useful family rhythm without turning herself into a chore-system administrator.

- Current situation: the chore begins as a thought, spoken request, or repeated reminder while Maya is already doing something else.
- What she's trying to become/do: make responsibility clear enough that the family can participate without her translating or reassigning it every day.
- Emotional state or tension: she wants dependable follow-through, but more fields, rules, and monitoring would simply move the burden into Kwilt.
- What would make this feel wrong to her: a project-management form, silent AI assignments, a required reward economy, a rules engine, or a setup flow that asks her to define the whole household program before capturing one chore.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - the chore matters because ordinary household commitments need to become dependable action.

## Job flow step

`job-flow-maya-move-family-life-forward`:

- **Capture a family or personal to-do** is currently 4/5, but ordinary Quick Add does not author Chore participation or household policy.
- **Schedule or hand off** is currently 2/5; Chore creation needs to make responsibility and availability explicit without forcing assignment.
- **Family participation** is currently 3/5; the remaining gap is a mature household responsibility loop that a parent can establish and a child can understand.
- **Keep using the system** is currently 3/5; creation must reduce remembering work instead of introducing configuration upkeep.

## Active anchors

- `jtbd-carry-intentions-into-action` - the parent's passing observation needs to become a durable, recurring household responsibility.
- `jtbd-invite-the-right-people-in` - authoring must share only the chore and its actionable context with eligible household members.
- `jtbd-trust-this-app-with-my-life` - direct and AI-assisted creation must converge on the same visible, reviewable household truth.

## Friction we're addressing

The current Chores learning slice begins after chores and expectations already exist. A caregiver can inspect and review simulated occurrences but cannot create the underlying Chore profile. Ordinary To-do capture is fast, yet it does not express whether work belongs to a named member or the Household, when it becomes available, or what “done” means. Without a parent creation flow, the child experience depends on invisible setup outside the product.

## System alignment

Constraint posture: `Fit the system`

Current system facts:

- Existing surface: Chores is a direct capability with a quiet inventory; Kwilt already uses bottom action docks for persistent capture and contextual Chat entry. The current learning slice also has a caregiver-only approval count and review drawer, but reaches them through a separate floating guide.
- Existing user flow: To-dos uses a title-first Quick Add dock and progressive detail; other capability surfaces open contextual Chat with bounded launch context and an exact return path.
- Existing domain/data model: Activity is the canonical doing object, an Activity occurrence is the executable unit, and a Chore profile adds household participation, availability, review, definition-of-done, and optional token policy. Expectations and Screen Time agreements are separate objects that reference chore completion facts.
- Existing technical affordances: `QuickAddDock` supports an embedded direct composer beside contextual Chat; Unified Chat supports bounded context and native reviewed-write handoffs; Chores currently remains a local Labs adapter and `chores.open` is boundary-only until household-authorized Activity tools exist.
- Existing UX/copy conventions: capture never requires Arc or Goal selection; one bottom action region owns the current action; AI proposes and the capability reviews/applies; household life is described in plain language rather than recurrence or workflow jargon.

Constraints to preserve:

- Direct creation and Chat-assisted creation must produce the same canonical Chore draft and save through Chores-owned authority.
- The resting dock must remain simple: one direct capture affordance, one stable contextual Chat circle, and at most one conditional caregiver-review circle.
- Capture starts with the chore's name; optional policy is progressively disclosed and may be completed after initial capture.
- The parent must see and confirm who can do the chore and when it becomes available before it can affect a child's experience.
- Assignment is not the default organizing mechanism. A household-open chore remains a first-class outcome.
- Tokens, caregiver review, and definition-of-done are per-chore options; tokens disappear when the household program is off.
- Per-person expectations, benefit links, Screen Time enforcement, rotations, and household-wide policy do not belong in the single-chore creation form.
- Chat may clarify or prepare one or more drafts, but it cannot silently create, assign, schedule, reward, or connect a chore to Screen Time.
- Child requests must remain capability-owned and must never appear in a child's Chores projection as caregiver alerts or approval controls.

Constraints we may challenge:

- The generic To-do Quick Add commit path is too personally scoped for Chores. Chores should directly reuse the existing `QuickAddDock` component and its AI-action presentation, but submit into a smaller household-specific **New chore** editor drawer instead of inserting an Activity into the list.
- A direct capture does not need every Chore field before the title can be retained, but the chore must remain a private caregiver draft until the minimum household-visible facts are confirmed.

Design implication:

Use one standard action-dock composition at the bottom of the caregiver Chores inventory:

1. The left side says **Add a chore** and opens a title-first composer.
2. **Review requests** is a full-circle caregiver action that appears immediately to the left of Chat only when one or more child submissions are waiting. It carries a compact count badge. One request opens directly to its review detail; several open the existing review queue drawer.
3. **Chat about chores** remains the stable far-right circle and opens Unified Chat with Household and Chores context attached.

The conditional review action replaces the separate floating review guide inside Chores; the capability-menu badge remains the out-of-capability attention signal. Resolving the last request removes the review circle after the drawer closes while leaving the Chat action anchored.

Direct capture and Chat both converge on one Chores-owned **New chore** editor drawer whose minimum publishable contract is: chore name, **For** (a named member or **Household**), **Available** (plain-language timing), and an explicit save. It is the actual creation surface, not a proposal preview or confirmation step. The parent can edit immediately while AI fills only untouched fields. Definition of done, review, and token value are progressive options. The saved chore returns to the inventory with a concise receipt and can be edited there; expectations are configured separately from saved inventory, not during capture.

## Aspirational design challenge

How might we help Maya turn a passing household need into a clear, reusable family responsibility in seconds, while preserving child-legible rules, explicit caregiver authority, and one trustworthy Chore truth whether she types directly or asks Chat for help?

## Out of scope

- Implementing the flow or registering Chores write tools in Chat.
- Designing per-person expectation authoring, Screen Time criteria, token redemption, or a household rules dashboard.
- Rotation, automatic workload balancing, collaborative chores, or bulk assignment.
- Production household authorization, offline reconciliation, notifications, or shared-device caregiver re-entry.

## Open question

Should contextual Chat be allowed to prepare a small batch of chore drafts for one review session, or should the first slice preserve a strict one-request, one-draft flow?
