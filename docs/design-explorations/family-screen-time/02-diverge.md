# Diverge: Family Screen Time Rule Models

## Fixed frame

The product is a deterministic family rule system. Chore status and time of day govern access to selected apps, categories, or websites. Routine cases should resolve without a caregiver; requests are for genuine exceptions.

## Axis of variation

The alternatives differ in the **primary thing a caregiver thinks about while setting a rule**:

1. The screen activity being governed.
2. The real-life responsibilities that come first.
3. The phase of the child's day.

These are different mental models, not different visual treatments of one rule builder.

## Alternative A: Access Agreements

### Sketch

The caregiver begins with an activity group such as **Games**, **Entertainment**, or a custom selection. Kwilt presents one sentence-shaped agreement:

> **Games are available on school days from 4:00–7:00, after Homework and Feed the dog, for up to 30 minutes.**

The caregiver fills four structured slots: what, when, after what, and how much. The child sees the same agreement translated into its current state: **Games open at 4:00 after homework**, **Feed the dog to open games**, or **18 minutes left today**.

A caregiver can duplicate an agreement to another child, but the copy becomes independent. Exceptions are launched from the agreement and must name what they override and when they expire.

### Audience and persona fit

Strong fit for Maya because it answers the question she already faces: “When may this child use this kind of app?” It minimizes new family-process concepts and makes the enforced outcome explicit.

### Design-challenge answer

The caregiver and child share one readable contract. Kwilt evaluates it continuously and only escalates when the family chooses to depart from it.

### System fit

- Constraint posture: `Extend the system`.
- Adds a Screen Time-owned `AccessAgreement`/rule model and criterion evaluation without adding a new top-level planning object.
- References Kwilt Activities for chore/homework completion. It does not turn an Activity into currency or require an Arc/Goal relationship.
- Uses the existing app/category selection and Managed Settings concepts, then adds household policy sync and Device Activity monitoring.

### Four-object and capture-first posture

- Activities remain the atomic record of real-world doing.
- Goals and Arcs are not required to create a Screen Time rule.
- Chapters remain retrospective and uninvolved.
- Recording or completing an Activity is never blocked by Screen Time setup. Kwilt itself should remain available so the child can see rules and record permitted completion.

### Best when

- The family has a small number of screen categories with different rules.
- Caregivers want precise, child-specific agreements.
- The primary pain is explaining why a particular app is blocked.

### Fails when

- Many activity groups repeat the same schedule and responsibilities, producing duplicated maintenance.
- Caregivers think “finish the after-school routine” rather than “configure Games.”
- The interface exposes every possible criterion and becomes an automation editor.

### Primer anti-pattern check

Passes if agreements stay sentence-shaped, deterministic, private, and few in number. Fails if the home becomes a rules dashboard, if completion earns scores/streaks, or if AI decides whether a child deserves access.

## Alternative B: Responsibilities First

### Sketch

The caregiver begins with the recurring Activities that matter: **Homework**, **Feed the dog**, and **Put lunchbox away**. At the bottom of that required set, the caregiver chooses the consequence:

> **When these are complete, allow Games for 30 minutes until 7:00.**

The child experiences an ordinary short list of what needs doing. The Screen Time consequence is secondary: **Two things before games**. As each Activity becomes complete or approved, the explanation updates. When all requirements are satisfied inside the allowed window, Kwilt opens the selected screen activity automatically.

This alternative does not create a generic Routine planning object. It saves a Screen Time condition set that references recurring Activities; the Activities themselves remain the day's plan.

### Audience and persona fit

Strong fit when Maya naturally organizes family life around what needs to happen next. It makes real life primary and screen access the consequence rather than the center of the family experience.

### Design-challenge answer

The child sees a concrete route forward without negotiating, and the caregiver does not have to translate household expectations into separate app-by-app controls.

### System fit

- Constraint posture: `Extend the system`, with a deeper dependency on shared/assigned Activities.
- Requires dependable recurring Activity assignment, child-visible completion, and configurable review semantics.
- The Screen Time rule subscribes to Activity state; it must not become the canonical owner of chores or homework.
- One condition set may open several activity groups, reducing duplicated configuration.

### Four-object and capture-first posture

- Activities remain the only day-level planning unit and the source of completion truth.
- The condition set is policy configuration, not a Goal, plan, or new routine object.
- Unanchored Activities remain valid; a household responsibility need not belong to an Arc or Goal.
- A caregiver or child can capture an Activity without first assigning a Screen Time consequence.

### Best when

- The same responsibilities govern several kinds of entertainment.
- The family already uses Kwilt Activities for chores/homework.
- The desired language is “what comes first?” rather than “how do we limit this app?”

### Fails when

- Kwilt's household Activity participation is not mature enough to make completion trustworthy.
- A family wants simple time-of-day limits with no responsibility dependency.
- Screen access makes ordinary responsibilities feel like a chore marketplace.

### Primer anti-pattern check

Passes if the list remains ordinary, non-scored family work and Screen Time stays secondary. Fails if Kwilt adds points, streaks, child rankings, celebratory overproduction, or pressure to attach every Activity to a reward.

## Alternative C: Family Day Windows

### Sketch

The caregiver begins with the child's day and defines a few named windows:

```text
School morning   7:00–8:15    Communication and school only
After school     3:30–7:00    Entertainment after required Activities
Evening          7:00–8:30    Family-selected apps, 30-minute cap
Bedtime          8:30–7:00    Always-available apps only
```

Each window defines a default set of available activities and may include an entry condition such as **after today's required Activities are complete**. The child's home emphasizes the current phase and next transition: **After school: finish homework to open entertainment** or **Evening access begins at 7:00**.

Exceptions change the current window temporarily rather than editing individual app rules.

### Audience and persona fit

Strong fit for a household that experiences Screen Time as part of a daily rhythm. Maya configures four understandable parts of the day once instead of maintaining many app rules.

### Design-challenge answer

The device follows the family's rhythm automatically, and the child always knows which part of the day they are in and what changes next.

### System fit

- Constraint posture: `Extend the system`, with the broadest Screen Time policy model.
- Reuses app selections, schedules, Activities, and Device Activity thresholds but groups them under named schedule windows.
- Day windows are Screen Time policy, not Chapters and not a second planning calendar.
- Requires careful overlap, travel, school-calendar, weekend, daylight-saving, and exception semantics.

### Four-object and capture-first posture

- Day windows do not contain future work. They reference today's Activities for condition truth.
- Arcs, Goals, and Chapters remain unchanged.
- Activity capture remains available during every window.
- The model must not become a general family scheduler alongside Kwilt's existing Activity/calendar behavior.

### Best when

- The family has stable school-day and weekend rhythms.
- Most screen activities share the same broad availability.
- Low rule count matters more than per-app precision.

### Fails when

- Family schedules change frequently or differ substantially by child.
- Overlapping windows and special days require constant editing.
- One broad “mode” blocks too much and hides the specific reason an app is unavailable.

### Primer anti-pattern check

Passes if there are only a few calm windows and the child sees plain explanations. Fails if it becomes a dense schedule dashboard, creates urgency around transitions, or duplicates calendar planning.

## Comparative read

| Alternative | Caregiver starts with | Child primarily sees | Configuration burden | Main dependency | Main risk |
| --- | --- | --- | --- | --- | --- |
| Access Agreements | A screen activity | The rule for this activity | Medium | Screen Time policy engine | Repeated criteria across rules |
| Responsibilities First | What must happen first | The short path to access | Low–medium | Household recurring Activities | Chores become transactional |
| Family Day Windows | The child's daily rhythm | Current window and next change | Low when schedules are stable | Robust scheduling and precedence | Becomes a second calendar |

## Divergence checkpoint

All three can implement the confirmed rule semantics. The choice is which mental model deserves to organize the product. No winner is selected in this phase.
