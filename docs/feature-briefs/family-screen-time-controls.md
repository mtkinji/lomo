---
id: brief-family-screen-time-controls
title: Family Screen Time Controls
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-household-foundation, brief-household-activity-assignment, brief-chores-as-recurring-activities, brief-screen-time-controls-contextual-setup]
owner: andrew
last_updated: 2026-07-23
---

# Family Screen Time Controls

## Context

Andrew and Blaire repeatedly unlock their children's devices because native controls do not express the family's ordinary agreement or make exceptions and delivery state clear. Kwilt already has adult self-control Screen Time behavior, but family management requires distinct household authority, child-device authorization, offline enforcement, and child-facing explanations.

## Target audience

`audience-aspirational-family-organizers` wants predictable family routines with less negotiation and less administrative overhead.

## Representative persona

Maya wants the child's device to follow the family agreement so the child knows what happens next and either caregiver can handle a true exception.

## Aspirational design challenge

How might we let Maya's family express one understandable access agreement that the child device enforces dependably, while preserving child dignity, private family boundaries, and truthful delivery state?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` is the demand spine because access rules are valuable only when they protect family intentions and reduce the work of carrying them out.

## Job flow step

The work supports Maya's **Family participation**, **Schedule or hand off**, and **Keep using the system** steps, all currently incomplete. It should not receive a delivery-score increase until a real family uses the behavior dependably.

## JTBD framing

When a child reaches for entertainment, the family wants the device to follow the agreement they already made—recognizing time, completed responsibilities, and use already consumed—so the child knows what happens next and neither caregiver reconstructs the decision each time.

## Design

### Relationship boundaries

- Kwilt Household governs owner/caregiver/child participation and capability authority.
- Apple Family Controls `.child` authorization governs whether the physical device can be managed.
- App Store Family Sharing governs neither Kwilt authority nor policy delivery.
- Adult `.individual` Screen Time remains a separate mode and feature brief.

### Managed-device contract

- Bind one install/device identity to one dependent member profile.
- Record authorization and capability state without exposing Apple's opaque selection tokens outside their required device boundary.
- Maintain desired policy version, last applied version, enforcement state, and reconcile receipts separately.
- Caregiver-authenticated release clears shields/monitoring and acknowledges cleanup.
- Sign-out, unlink, reinstall, clock changes, missed pushes, and offline use have explicit safe behavior.

### Rule progression

#### First independently valuable rule

> Games are available on school days from 4:00–7:00 for up to 30 minutes.

This proves enrollment, scheduling, usage measurement, local enforcement, explanation, exception, and delivery truth without depending on Chores.

#### Integrated family access agreement

> Games are available on school days from 4:00–7:00 after today's responsibilities are complete, for up to 30 minutes.

This adds references to one or two assigned Activity occurrences. Screen Time never owns or edits the responsibility.

### Evaluation

Rule criteria combine deterministically with AND semantics:

- selected apps/categories;
- local-time window;
- zero or more required Activity occurrence states; and
- optional daily foreground-usage cap.

The child sees only the current reason and next action. Caregivers see the readable agreement, exceptions, and actionable device truth rather than a surveillance dashboard.

### Offline and reconciliation

- Child device retains the last valid policy and locally required occurrence window.
- Device Activity/Managed Settings enforce windows and thresholds while Kwilt is closed.
- Eligible Activity completion triggers local re-evaluation.
- Push is a reconcile hint; the device fetches authoritative desired state.
- Commands and events are idempotent, versions monotonic, and receipts causally attributable.

### Exceptions

The child may request **Use now**, **More time today**, or **Something is wrong**. Either authorized caregiver may approve a bounded exception or keep the family rule. The first valid decision closes the request. Approval is not shown as applied until the managed device acknowledges it.

A denial is a durable decision, not the dismissal of one notification:

- Requests deduplicate by child, device, target, and current rule/access state.
- **Keep the rule** suppresses another time request until a meaningful eligibility boundary changes, such as the next rule window, completion state, daily reset, or caregiver policy edit.
- The caregiver may choose **Not today** when they want an explicit local-day boundary. The child then sees **Not available today** rather than another request button.
- Repeated taps while a request is pending or denied never create new caregiver notifications.
- **Something is wrong** remains available as a separate help path; it cannot be used to create another time request.

The child surface explains when requesting becomes available again. Kwilt must not reproduce the native loop in which every tap becomes a fresh time-sensitive interruption after the caregiver has already said no.

## Success signal

The child can predict when access changes, ordinary transitions happen without asking for an unlock, either caregiver can handle a real exception, and the family can distinguish a policy decision from device delivery.

Physical-device proof must cover schedule transitions, foreground usage threshold, background behavior, offline expiry, reboot, stale/missed delivery, caregiver failover, and release cleanup. Simulator, archive, TestFlight, and production proof remain separate.

## Non-goals

- Detailed app-usage surveillance, content inspection, messages, browsing, or location tracking.
- Chore currency, earned-time wallet, rewards, points, rankings, or allowance.
- Arbitrary boolean rule builders or overlapping-rule administration.
- Android enforcement in the learning release.
- Multiple children/devices/rules before the bounded family path is dependable.
- Subscription pricing or App Store Family Sharing activation.

## Open questions

- Which failures should preserve the last valid rule versus require caregiver intervention?
- How long may cached Activity occurrences and policies remain valid offline?
- Does schedule-only access remove enough requests to justify shipping before chore integration?
- Which custom shield actions can reliably route to the exact next responsibility across supported iOS versions?
