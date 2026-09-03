# Converge: Pro Automation And Managed Household

## Chosen alternative

Choose a refined **automation and composition boundary**, paired with the
independent managed-Household coordination boundary. This supersedes the
initial 2026-09-02 convergence on Alternative A: scheduling and compound rules
are Pro even when their condition facts are otherwise standard.

The resulting commercial rule is:

| | Local or in-person | Managed through a Kwilt Household |
| --- | --- | --- |
| **Simple unscheduled controls** | Free | Pro |
| **Scheduled, composed, or Kwilt-native controls** | Pro | Pro |

## Qualitative scoring

| Alternative | Maya and active JTBDs | Customer clarity | App Review posture | Current-system fit | Revenue strength | Overall |
| --- | --- | --- | --- | --- | --- | --- |
| A. Kwilt Truth | Strong | Strong | Most conservative | Medium | Strong | Rejected after initial convergence |
| B+. Automation and composition | Strong | Strong when framed as saved caregiver work | Balanced but more aggressive | Strong | Strongest | **Choose** |
| C. Assisted Intelligence | Mixed | Moderate | Most conservative | Weak | Unproven | Keep as fallback |
| D. Underlying Capability | Moderate-strong | Uneven | Very strong | Medium-low | Medium | Keep as fallback |

The refined alternative best serves `jtbd-put-intention-before-impulse`
because Pro makes the agreement run on a schedule or respond to multiple facts,
`jtbd-invite-the-right-people-in` because managed authority is a separate paid
service, and `jtbd-trust-this-app-with-my-life` because the line is based on
automation and coordination rather than app, rule, or minute quotas.

## Precise classification

### Free local foundation

A device-local rule remains Free when it contains exactly one unscheduled
standard condition:

- **Focus is running**; or
- **daily usage allowance**.

Immediate manual local blocking and releasing also remain Free.

App, category, website, rule, or minute counts do not determine access class.
The first scheduled condition or second condition changes the rule's access
class; enforcement strictness does not.

Authorization, Apple's picker, native enforcement, shield explanation, local
editing, disabling, deletion, release, and recovery remain Free substrate.

### Pro automation, composition, and Kwilt-native conditions

A local rule is Pro when it contains any of the following:

- **time of day**, a recurring schedule, or another scheduled activation;
- two or more conditions, including explicit AND/OR composition; or
- a condition or behavior backed by Kwilt-created policy truth, including:
  - Activity or responsibility completion;
  - Money review or budget state;
  - earned, carried, replenished, or otherwise derived access;
  - prerequisite-app or family-day state;
  - reviewed exceptions or adaptive policy; or
  - a future cross-capability condition not included in the standard allowlist.

Chat may preview any rule for Free. Executing a Chat-authored rule follows the
same classification; Chat itself does not make scheduling, composition, or a
Kwilt-native condition Free.

### Pro managed-Household coordination

Coordination is Pro whenever Kwilt:

- binds an authorized device to a named dependent;
- grants scoped control to one or more remote caregivers;
- creates, changes, or delivers policy across devices;
- records desired-versus-applied receipts;
- routes child requests or temporary caregiver exceptions; or
- manages reconciliation, replacement, history, or recovery remotely.

A managed-Household rule is therefore Pro even when its underlying control
would be Free locally. The user is paying for relationship, authority,
delivery, and reliability services—not for additional Apple-selected apps,
minutes, or native enforcement.

### Free family starter

A caregiver may complete an in-person, device-local family setup without Pro:
Apple guardian authorization, private app/category selection, and one useful
unscheduled, single-condition local rule on that device. This setup is not
bound to a named Kwilt dependent and is not remotely administered through the
Household control plane.

The Free starter must produce a useful enforced outcome. It may not stop after
permission, selection, or a preview.

## Capability delta

### Today

- A second condition makes a personal rule Pro, but a single scheduled
  time-of-day rule does not.
- Every family enrollment, selection, delivery, creation, tightening,
  extension, and override is classified as Pro.
- Product copy markets scheduled and combined Screen Time rules as paid value.
- The personal remote fallback does not produce a symmetric family starter or
  family rollback.

### After this decision is implemented

- A Free person can use an unscheduled, single-condition local rule based on
  Focus or daily usage.
- A caregiver can establish that useful basic local protection on a child
  device in person without joining the paid Household control plane.
- Pro begins when a rule runs on a schedule, composes conditions, depends on
  Kwilt-owned policy truth, or is managed across people or devices.
- Product and review copy can explain exactly what Kwilt adds beyond Apple's
  primitives.

### Still intentionally unsupported

- Free remote management of a named dependent.
- Free multi-caregiver authority, delivery receipts, child requests, or managed
  device recovery.
- Free Activity-, Money-, earned-access-, or other Kwilt-native policy
  conditions.
- Silent conversion of a dormant Pro family rule into a local Free rule after
  downgrade.

## Accepted trade-offs

- Free retains a complete basic local control path without receiving Kwilt's
  scheduling or rule-composition engine.
- The classifier combines condition count with condition and behavior type.
- A simple rule may be Free locally but Pro when managed remotely; UI copy must
  explain the coordination value at the moment it is requested.
- App Review discretion remains even with the clearer boundary.

## Rejected trade-offs

- Do not meter selected apps, blocked minutes, rule count, or enforcement
  strictness. Scheduling itself is Pro; the number of schedules does not create
  another tier.
- Do not make authorization, the native picker, enforcement, release, or cleanup
  a paid entitlement.
- Do not give away the managed Household merely to prove a Free family path.

## Reductive design decisions

- Reuse the existing Screen Time rule model, builder, and settings inventory;
  do not create separate Basic and Advanced products or screens.
- Represent access class as a derived policy decision, not a user-facing mode.
- Keep one local rule-building ladder—simple, scheduled/combined, then connected
  to Kwilt—and preserve the separate **Use on this device** versus **Manage with
  your Household** topology choice.
- Do not add quotas, comparison dashboards, policy scores, or a permanent
  pricing explainer inside rule management.
- Keep Activities as ordinary units of doing. A Screen Time consequence never
  blocks Activity capture or requires an Arc or Goal.

## Activation path

1. Let the person authorize Screen Time and save a useful unscheduled,
   single-condition local rule before presenting an upgrade.
2. Offer Pro contextually when they add a schedule, a second condition, a
   Kwilt-native condition, or choose **Manage with your Household**.
3. Preview the exact resulting agreement and preserve the draft across plan
   selection and Restore.
4. Explain the added outcome—the rule runs automatically, responds to more than
   one fact, puts responsibilities or Money review first, or reaches the right
   caregiver and device—without promising paid access to Screen Time.

Natural adoption means a person first succeeds with a basic local rule and
later intentionally asks Kwilt to run it automatically, combine it with other
conditions, connect it to meaningful life context, or coordinate it across the
family.

## Downgrade behavior

- Free unscheduled, single-condition local rules continue normally.
- Pro personal and managed-Household rules become dormant as whole rules when
  entitlement expiration or refund is confirmed.
- Kwilt never silently strips a Pro condition or converts a remotely managed
  agreement into a local rule.
- Reading, explanation, loosening, disabling, deletion, release, cleanup, and
  subscription management remain available.
- Desired enforcement is cleared and remains visibly pending until the relevant
  device acknowledges cleanup.
- Resubscription never silently reactivates a dormant rule.

## System implications

- Extend the existing condition-count classifier so time-of-day and recurring
  schedule conditions also require Pro.
- Separate local family starter actions from managed-Household actions in the
  family access policy.
- Align client, server, deep-link, Chat, and remote-configuration decisions to
  the same policy.
- Describe Pro as Screen Time automation, combined rules, conditions connected
  to Kwilt, and managed family agreements—not as paid API access.
- Preserve an ordinary, customer-visible remote fallback that makes scheduled,
  composed, and Kwilt-native local authoring Free and removes Screen Time from
  paid-benefit copy if App Review rejects the boundary. It must never be
  reviewer-specific behavior.

## Stated bet

We're betting that people will recognize two meaningful reasons to choose Pro:
Kwilt runs and composes their rules automatically, or Kwilt relieves the work
of coordinating that agreement across their Household. Kwilt-native life
context strengthens the first reason. If customers do not understand or value
that distinction—or App Review rejects it—we will fall back to charging only
for paid source services and managed coordination, then reassess advanced local
authoring from observed use.

## Success signal

- Free users can complete and retain a useful unscheduled, single-condition rule
  without a paywall.
- Upgrade views occur only after an intentional scheduling, composition,
  Kwilt-native, or managed-Household action.
- Customers and reviewers can accurately explain what Pro adds without saying
  that it unlocks Apple's Screen Time APIs.
- Signed-device evidence proves the Free and Pro paths, downgrade cleanup, and
  desired-versus-applied family delivery separately.
