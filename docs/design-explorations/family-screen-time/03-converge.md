# Converge: One Family Access Rule, Two Perspectives

## What the uncertainty revealed

Andrew could reasonably imagine beginning with either the screen activity or the responsibility. That is evidence that these are not competing domain models. They are two ways of reading the same family agreement.

Kwilt should store one rule and present the part that matters in context:

- A caregiver configuring policy sees the complete agreement.
- A child trying to understand access sees the currently unsatisfied criterion or remaining use.
- An Activity may show that it participates in an access rule, but it does not own a separate Screen Time rule type.

## Qualitative scoring

| Alternative | Maya fit | Child legibility | Current-system fit | Configuration restraint | Technical risk | Read |
| --- | --- | --- | --- | --- | --- | --- |
| Access Agreements | Strong | Strong | Strongest | Medium | Medium–high | Best structural backbone |
| Responsibilities First | Strong | Strongest when chores block access | Depends on mature household Activities | Strong | High | Best contextual child projection |
| Family Day Windows | Medium–strong | Strong when schedules are stable | Medium | Strong initially | Highest scheduling complexity | Useful future template, not core model |

Access Agreements wins as the canonical model. Responsibilities First is incorporated as a presentation principle rather than a second setup system. Family Day Windows is deferred; time windows remain criteria inside a rule.

## Chosen concept

### Family Access Rule

One deterministic rule connects four optional/required parts:

```text
[Selected screen activity]
is available [during these days/times]
after [these Activities are complete or approved]
for up to [this much foreground use].
```

Example:

> **Games are available on school days from 4:00–7:00, after Homework and Feed the dog, for up to 30 minutes.**

The rule is one object regardless of which slot the caregiver fills first. The composer may recommend an order, but every filled slot remains visible as one sentence before activation.

### Adaptive child explanation

Kwilt evaluates the rule and names the next useful truth rather than displaying the entire policy every time:

- Before the window: **Games open at 4:00 after homework.**
- During the window with incomplete work: **Finish homework to open Games.**
- Eligible and unused: **Games are available for 30 minutes.**
- In a session: **18 minutes left today.**
- Usage exhausted: **Games are finished for today.**
- Device has not applied the policy: **Kwilt is reconnecting this device. Ask a caregiver if this does not clear.**

The caregiver can always inspect the complete rule. The child can always see which caregiver controls it and request a bounded exception, but cannot unlink or disable enforcement.

## Capability delta

### Today, the family cannot

- Express “these apps, during this window, after these responsibilities, for this much use” as one enforceable rule.
- Let Kwilt automatically reconcile Activity completion, clock time, and foreground app usage on a child's device.
- Let either caregiver see whether a rule decision was actually applied on a specific child device.
- Give the child a reliable explanation and next action without a parent interpreting Apple's controls.

### After this concept ships, the family can

- Create one readable rule for one child and one selected activity group.
- Use named/recurring Kwilt Activities as deterministic completion criteria.
- Let time, completion, approval, and usage thresholds open or shield selected apps automatically.
- Handle only real exceptions through either authorized caregiver account.
- Distinguish **rule permits access** from **applied on the child's device**.

### The workaround that goes away

The child no longer brings the device to a parent, asks for an unlock, explains the situation, waits while the parent reconstructs the rules, and receives an arbitrary extension. Kwilt evaluates the already-agreed rule and explains the result.

### Still intentionally unsupported

- A general-purpose `if this, then that` automation builder.
- Nested boolean groups, location criteria, grades, health data, AI judgment, or content surveillance.
- Chore points, child rankings, streaks, or a universal earned-time economy.
- A new Routine or Day Phase planning object.
- Child-controlled unlinking, device retirement, or authorization revocation.
- Android enforcement in the first release.

## Rule semantics

### Criteria

- `target`: one privacy-preserving selection of apps, categories, and/or web domains.
- `schedule`: allowed weekdays and local-time window; required for the first version.
- `responsibilities`: zero or more Activities; each specifies whether child completion is sufficient or caregiver approval is required.
- `usageCap`: optional foreground-usage duration inside the applicable daily window.

All configured criteria use **AND** semantics. The family does not configure boolean operators.

### Precedence

1. Always-available communication/safety selections remain available.
2. Hard blocked windows win over normal access rules.
3. A normal rule permits access only when every configured criterion is true.
4. A bounded caregiver exception may override named criteria until an explicit expiry.
5. When another Apple restriction is stricter, Kwilt explains that it cannot remove that restriction.

### Completion truth

- A daily recurring Activity satisfies only its current occurrence.
- Deleting, rescheduling, or unassigning a required Activity must produce an explicit rule consequence, not silently open access.
- Review policy belongs to the Activity/rule reference and remains stable across occurrences.
- Kwilt Activities remain the canonical record of doing; Screen Time stores only the reference and criterion state needed for enforcement.

## Accepted trade-offs

- The caregiver may still think responsibility-first, but the primary setup home remains Screen Time so Kwilt does not scatter rule creation throughout Activities.
- Activity detail may later offer a restrained contextual shortcut such as **Use before Screen Time**, but the first release does not need a second composer.
- One rule targets one screen-activity selection. Repeated schedules across several rules are acceptable initially and should be observed before adding shared templates.
- A time window is required initially because it gives every rule a safe outer boundary and predictable daily reset.

## Rejected trade-offs

- Do not create separate “app rules” and “chore unlocks” that can contradict each other.
- Do not create a new family calendar or named Day Phase model merely to reduce repeated schedules.
- Do not make the child choose or purchase minutes before using an eligible app in the first concept.
- Do not expose server/device orchestration as a caregiver operations dashboard. Show only actionable delivery truth on the child/rule surface.

## System implications

### Product/domain

- Add a household-scoped Family Access Rule with child scope, criterion definitions, versioning, active state, and audit history.
- Reference assigned Activity occurrences without moving Activity ownership into Screen Time.
- Model caregiver exceptions separately from durable rule edits.
- Preserve independent `owner`, `caregiver`, and `child participant` relationships plus capability/child scopes.

### Device enforcement

- Add `.child` Family Controls enrollment alongside the existing `.individual` path.
- Add a Device Activity monitor extension for schedules and foreground-usage thresholds.
- Compile authoritative cloud rules into a child-device-local enforcement projection.
- Reconcile Managed Settings from clock, Activity criterion, exception, and usage state.
- Emit receipts for received policy, evaluated state, shield applied/cleared, threshold reached, exception expiry, and cleanup.

### UX surfaces

- **Household settings:** people, caregiver scope, child profiles, and managed-device enrollment.
- **Caregiver Screen Time:** child -> readable rules -> current exceptions/device truth.
- **Rule composer:** one sentence with What, When, After, and How much.
- **Child Screen Time:** current access, the next unsatisfied criterion, remaining use, and request exception.
- **Shield:** the same child explanation plus the next valid action.

## Reductive design decisions

- One rule type, not separate chore, schedule, allowance, and unlock rule types.
- One canonical composer inside Screen Time.
- No rule-builder canvas, nested logic, dashboard, points, wallet, or family performance feed.
- No new planning object. Activities remain the day-level work.
- No default notification when a rule evaluates normally. Notify caregivers only for configured review or a genuine exception.
- No separate parent and child app-store products; one Kwilt app renders role-aware surfaces.

## Activation path

The caregiver is most ready immediately after enrolling the first child device. Kwilt should offer one guided starter agreement using a real example, not a tour of every option:

1. Choose a screen activity such as Games.
2. Set the allowed window.
3. Optionally choose the Activities that come first.
4. Optionally set a usage cap.
5. Preview exactly what the child will see.
6. Activate only after the child device confirms receipt.

Existing adult `.individual` Screen Time users should see family setup as a separate invitation, never an automatic migration. A family naturally adopts the feature when one recurring rule resolves access for several days without a manual unlock.

## Stated bet

> We're betting that most recurring family Screen Time decisions can be expressed as one readable agreement combining a target, time window, responsibility state, and optional usage cap—and that showing the child only the currently relevant criterion will reduce requests without making the system feel punitive. If that is not true, revisit with responsibility-first setup shortcuts or reusable family-day templates rather than adding arbitrary rule logic.

## Success signal

The concept is working when:

- Andrew or Blaire can create the intended rule without learning automation terminology.
- A child can correctly explain why an activity is or is not available and what happens next.
- Ordinary eligible access opens and expires without caregiver action.
- Manual unlock/exception requests materially decline during repeated family use.
- Both caregivers see the same authoritative rule and accurate child-device application state.
- No rule completion, deletion, sync delay, or subscription change leaves a child device incorrectly or irrecoverably shielded.
