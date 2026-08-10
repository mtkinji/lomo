---
id: brief-rule-based-screen-time-contextual-unlock
title: Rule-based Screen Time and contextual unlock
status: accepted
audiences: [audience-aspirational-family-organizers, audience-burned-out-productivity-power-users]
personas: [Maya, Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-screen-time-controls-contextual-setup, brief-family-screen-time-controls, brief-budget-unlock-bottom-guide]
owner: andrew
last_updated: 2026-08-10
---

# Rule-based Screen Time and contextual unlock

> **System ownership:** This brief refines the interaction model for the shared [Screen Time Control Plane](../architecture/screen-time-control-plane.md). Personal, Money, and family domains still own their conditions and durable editors. The control plane owns rule identity, active-restriction truth, temporary overrides, and the shield handoff.

## Context

Personal Screen Time currently presents one app selection with independent **A real step** and **Focus** switches. That makes selecting both look like one rule with unclear AND/OR behavior, even though they are separate reasons that may overlap. When a shield opens Kwilt, the app also forces a deep link into the condition owner's page. Money then renders its temporary-open control inside Budget Detail. The result is technically routed but disruptive: the person loses their place, and caregiver, child, and self-authored authority are not expressed in one coherent interaction.

## Target audience

Maya needs family rules that a child can predict and a caregiver can handle without reconstructing authority each time. Marcus needs self-authored guardrails that remain understandable and reversible without becoming a generic rules engine.

## Representative persona

Maya has set a meaningful access agreement for a child. When the child reaches a blocked app, the child should see what must happen next, while an authorized caregiver can handle a true short exception. Marcus may choose a short exception to his own personal or Money rule without losing the page he was using in Kwilt.

## Aspirational design challenge

How might we make every Screen Time restriction read as one named agreement with one understandable way forward, while preserving the person's place in Kwilt and never giving a child caregiver authority?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` remains the demand spine. A restriction is useful only when it helps the person return to the intended action with less negotiation and less context switching.

## Job flow step

This improves Maya's **Family participation**, **Keep using the system**, and **Recover when plans change** steps in `job-flow-maya-move-family-life-forward`. Those steps remain under-delivered until family authority and child-device behavior are proven on signed devices.

## JTBD framing

When a selected app is paused, show the active agreement and the next legitimate action without shame or surprise. Keep the current Kwilt context visible. Let an authorized adult make a bounded exception, but require a child to satisfy the agreement rather than quietly granting the same bypass.

## Design

### One card is one rule

The personal setup and management surface no longer presents multiple independent switches against one global app list. It presents rule templates as separate light cards:

- **Do a real step first** — choose apps, qualifying actions, and the release window for this rule.
- **Protect Focus** — choose apps that wait only while Focus is running.
- **Money review** and **Family agreement** remain in their canonical Money and Household editors, but compile into the same rule identity and enforcement projection.

Selecting two templates creates two explicit rules. Each rule owns its own `selectionId`, selected apps/categories, trigger, release behavior, authority policy, and current application receipt. If two rules cover the same app, access remains blocked until every applicable rule permits it. The UI must disclose the additional active reason and never imply that clearing one rule guarantees access.

### Preserve the current Kwilt page

Opening Kwilt from an Apple shield records a pending handoff; it does not deep-link to Money, Focus, Today, or Settings. On foreground:

1. Kwilt restores or retains its existing navigation state.
2. A root-level, non-blocking `BottomGuide` appears above the current page.
3. The guide resolves the active rule or rules, current subject, current actor authority, and valid actions.
4. The person may dismiss the guide without changing policy.
5. A route to the condition owner happens only after the person chooses the guide's **Do this first** or **Review rule** action.

A cold start uses the last valid persisted Kwilt route. If none exists, Kwilt uses its normal default route and still presents the guide after navigation is ready.

### Authority-aware actions

Actions are derived from the active rule and current actor, not from a generic bypass button.

- **Self-authored personal or Money rule:** the adult may keep the rule, go to the required action, or use a bounded temporary opening when the rule permits it.
- **Family rule, authorized owner or caregiver:** the adult may keep the rule, inspect the requirement, or create a bounded allow override for the named child and selection.
- **Family rule, child:** the child may see and go to the required action. The child never receives a direct temporary-open action and cannot approve their own access request.
- **Family rule, unscoped caregiver or other household member:** the guide explains that a caregiver with Screen Time access is needed. The UI and server both reject the override.

Child access requests remain a distinct caregiver-decision workflow. They may notify a caregiver, but they never make the child's local guide equivalent to caregiver approval.

### Temporary opening contract

Use one canonical first-release wall-clock window: **20 minutes**.

- Ten minutes remains the default minimum completed Focus duration for a **real step** qualification. It is not unlock copy.
- The legacy 15-minute personal bypass migrates to the canonical 20-minute temporary-opening policy.
- Money already defaults to 20 minutes and keeps that value.
- A future rule editor may offer other bounded durations, but the shield guide does not present a duration picker in the first release.

The action applies only to the named rule claims the actor is authorized to override. It never calls global clear. If another active rule still blocks the same selection, the receipt says so and advances to the next reason instead of claiming the app is open.

### Guide states

The guide is a light, inset card with the standard 28-point radius, no heavy scrim, and no clipped shadow. It has four states:

1. **Requirement:** names the agreement and what happens next.
2. **Authorized choice:** adds **Open for 20 min** when the actor and every affected claim permit it.
3. **Applying:** preserves the guide while the desired override is reconciled.
4. **Receipt:** says **Open for 20 min**, **Still blocked by another rule**, or **Could not apply** from authoritative state.

The page behind the guide remains visually and interactively present. Toasts stay suppressed while the guide is visible so transient feedback does not compete with the decision.

### Handoff and privacy

The native shield action records a short-lived handoff containing stable restriction identifiers, rule/selection identity, semantic reason labels already supplied by Kwilt, and request time. It does not expose Apple app tokens or invent a readable installed-app inventory in JavaScript. Handoffs are consumed once and expire after two minutes.

## Success signal

People can explain why an app is paused and what legitimate action will change it. A shield open preserves the last-viewed Kwilt page. Children cannot self-approve, authorized caregivers can create a bounded exception, and receipts never claim access when another rule still applies.

Proof requires domain tests for authority and overlap, Simulator proof of navigation preservation and guide hierarchy, and signed-device proof of shield handoff, per-rule clearing, caregiver override delivery, expiry, and child denial. Simulator evidence alone does not prove Apple-effective enforcement.

## Open questions

- Whether a later release should let an authorized adult choose 10, 20, or 30 minutes from the guide.
- Whether child access requests should be offered from the guide after the direct-unblock behavior is proven, or remain in the family Screen Time surface.
- How much active-rule detail should be disclosed when more than two restrictions overlap.

