---
id: brief-family-screen-time-controls
title: Family Screen Time Controls
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-household-foundation, brief-household-activity-assignment, brief-chores-as-recurring-activities, brief-screen-time-controls-contextual-setup, brief-screen-time-controls]
owner: andrew
last_updated: 2026-08-10
---

# Family Screen Time Controls

> **System ownership:** This brief defines family `.child` Screen Time agreements and caregiver authority. Shared selection, enforcement, receipt, conflict, and navigation rules are governed by the canonical [Screen Time Control Plane](../architecture/screen-time-control-plane.md). Family setup and editing remain owned by the named child inside Household.

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
- Household Foundation governs whether Screen Time is activated for this named child. A sibling's activation is independent.
- Apple Family Controls `.child` authorization governs whether the physical device can be managed.
- App Store Family Sharing governs neither Kwilt authority nor policy delivery.
- Adult `.individual` Screen Time remains a separate mode and feature brief.
- Screen Time is not a global-navigation destination. **Settings > Screen Time** may summarize the child's state, but setup and editing route to **People > Household > [Child] > Screen Time**.

Screen Time activation, caregiver authority, commercial entitlement, and managed-device readiness are separate states. Family Screen Time appears in the child's Kwilt experience only when activated for that child. If a rule references assigned Activities, To-dos must also be explicitly active for that child; a schedule-only rule has no To-dos dependency.

### Managed-device contract

- Bind one install/device identity to one dependent member profile.
- Record authorization and capability state without exposing Apple's opaque selection tokens outside their required device boundary.
- Maintain desired policy version, last applied version, enforcement state, and reconcile receipts separately.
- Caregiver-authenticated release clears shields/monitoring and acknowledges cleanup.
- Deactivation remains pending and visible until that cleanup receipt arrives; removing a menu item or entitlement never counts as device release.
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

An agreement may also include one privacy-preserving prerequisite activity:

- `selectionId`: the saved child-scoped app/category selection that must be used;
- `thresholdMinutes`: foreground minutes required within the agreement's reset window; and
- `reset`: `daily` for the first release.

The prerequisite selection is evidence of foreground app use only. Kwilt never claims that five minutes in Gospel Library proves scripture was read, understood, or taken seriously. The prerequisite remains available while the target selection is shielded.

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

### Direct temporary controls

When an Apple shield opens Kwilt, preserve the last-viewed page and show the shared
contextual Screen Time guide. A child sees the requirement but never a direct temporary
opening. An owner or caregiver with the named child's Screen Time grant may create the
canonical 20-minute wall-clock allow override; the guide stays **Applying** until device
delivery is acknowledged. Child access requests remain a separate approval workflow.

A caregiver also needs to act on an immediate family decision without editing the standing agreement or waiting for a child request:

> Turn off Brawl Stars for Charlie and Grant for the next three hours.

Kwilt interprets **turn off** as **temporarily block**, resolves the named children and their saved child-scoped **Brawl Stars** selections, computes an exact local expiry, and stages one compact consequential proposal in Chat. The proposal shows action, app/group label, every child, and the exact end time. It is never auto-applied.

The control plane uses two policy primitives and one request workflow:

- **standing agreement** — recurring family policy;
- **temporary override** — block or allow with automatic expiry;
- **access request** — a child/caregiver decision path that may create the same allow override with request provenance.

V1 direct controls support wall-clock **block**, wall-clock **allow**, **inspect**, and **cancel**. **Enable Brawl Stars for Charlie for the next 30 minutes** ends at an exact displayed time. **Give Charlie 30 minutes of Brawl Stars** means foreground usage and remains deferred until Device Activity threshold behavior is proven on signed devices.

An allow overrides named Kwilt family restrictions for that saved selection. It does not imply that Focus, Money, a personal agreement, communication/safety policy, or another Apple restriction was cleared. On expiry or cancellation, the child device recompiles every remaining claim rather than globally clearing shields.

Apple does not expose a readable installed-app inventory to Kwilt. The first request for an unknown app opens Apple's native picker for the exact child and saves a caregiver-defined selection label. Opaque Apple tokens remain on the authorized native side. Future Chat commands reuse that label. A multi-child command validates every child's saved selection before applying and never silently leaves the family in a partial state.

See [Family Screen Time Direct Controls](../design-explorations/family-screen-time-direct-controls/03-converge.md).

### Chat-created prerequisite rules

A caregiver may state the complete agreement in Chat:

> Create a rule that Charlie has to read scripture for at least five minutes before he can unlock games.

Chat resolves the authorized child plus two saved selections: the prerequisite (for example **Gospel Library**) and the target (for example **Games**). It never guesses an app from a bundle identifier or an installed-app inventory. If either selection is absent or ambiguous, Chat stages the exact native picker handoff and does not create a partial agreement.

With both selections resolved, Chat stages one consequential proposal:

> **Use Gospel Library before Games**
>
> Charlie uses Gospel Library for 5 minutes before Games become available each day.

Caregiver approval saves an active, versioned agreement. The receipt distinguishes **Saved**, **Applying**, **Applied**, **Needs device setup**, and **Failed**. Approval never implies the child device applied the rule.

On the child device, Managed Settings shields only the target selection. Device Activity monitors foreground usage of the prerequisite selection and calls the monitor extension at the threshold. The extension clears only this agreement's target store, records a local threshold receipt, and leaves unrelated Kwilt or Apple restrictions intact. The next daily interval restores the target shield before starting a fresh threshold.

Detailed exploration: [Family Screen Time Prerequisite Activity](../design-explorations/family-screen-time-prerequisite-activity/03-converge.md).

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

## Spec refinement: pre-TestFlight learning slice

The first implementation checkpoint does not require a second device or a TestFlight build. Andrew may create a dependent child profile, activate Screen Time for that child, and review the fixed schedule-only starter agreement in the Simulator:

> Games are available on school days from 4:00–7:00 for up to 30 minutes.

A development-only simulated device adapter may acknowledge desired policy versions so the caregiver experience can exercise `pending`, `applying`, and `applied` presentation. This state is local learning scaffolding, keyed to the signed-in caregiver and child membership. It never changes the server Household activation from `pending_setup`, never claims Apple authorization, and is unavailable in production builds.

The pre-TestFlight slice must prove:

- Screen Time activation is child-specific and reveals one setup path for that child.
- The starter agreement is readable without a generic rule builder.
- Desired and applied policy versions remain distinct in state and copy.
- The child preview explains the current time-window state without blame or surveillance language.
- Reloading the local build preserves the learning state for the same caregiver and child without leaking it to another child.

Signed physical-device and TestFlight proof remains required before the capability can claim authorization, app selection, scheduled enforcement, usage measurement, background behavior, offline behavior, or cleanup.

## Spec refinement: prerequisite foreground activity

Resolved implementation decisions:

- The customer-facing concept remains a Family Access Rule, not a generic rules engine.
- The first rule supports one child, one prerequisite saved selection, one target saved selection, a 1–1440 minute threshold, and a daily reset.
- Requests that say “read scripture” may resolve to **Gospel Library** only when that label is already saved for the child; otherwise Apple selection is required.
- Chat proposals require explicit caregiver approval and optimistic concurrency against the child's desired policy version.
- Agreement creation is atomic. A missing prerequisite or target selection cannot produce a partially active rule.
- General state and analytics receive semantic labels and coarse event metadata only; Apple tokens and usage history remain native.
- Source/tests can prove parsing, persistence contracts, generated native extension source, and receipt truth. Signed physical-device proof remains required for authorization, foreground counting, background callback, reset, shielding, and release.

Acceptance criteria:

- The example Chat request can invoke a typed `screen_time.agreement.create` tool call containing the authorized child, both saved selections, five minutes, and daily reset.
- Chat stages the exact readable proposal and never auto-applies it.
- Approval writes one active agreement, increments desired policy version, and produces a delivery-aware receipt.
- The native generated project contains a Device Activity monitor extension that shields the target at interval start and clears only its named store at threshold.
- Existing temporary block/allow proposals continue to parse and apply unchanged.
