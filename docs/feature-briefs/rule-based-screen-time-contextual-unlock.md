---
id: brief-rule-based-screen-time-contextual-unlock
title: Rule-based Screen Time and contextual unlock
status: accepted
audiences: [audience-aspirational-family-organizers, audience-burned-out-productivity-power-users]
personas: [Maya, Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-screen-time-controls-contextual-setup, brief-family-screen-time-controls, brief-budget-unlock-bottom-guide, brief-screen-time-rule-aware-recovery]
owner: andrew
last_updated: 2026-09-19
---

# Rule-based Screen Time and contextual unlock

> **Decision precedence (2026-09-19):** [Screen Time Rule-Aware Recovery](screen-time-rule-aware-recovery.md) supersedes this brief wherever it offers **Open for 20 minutes**, treats **Do this first** as universal, or models the contextual guide as an override surface. The guide now explains and routes only. Bounded-override infrastructure remains for separately owned caregiver/request workflows.

> **System ownership:** This brief refines the interaction model for the shared [Screen Time Control Plane](../architecture/screen-time-control-plane.md). Personal, Money, and family domains still own their conditions and durable editors. The control plane owns rule identity, active-restriction truth, temporary overrides, and the shield handoff.

## Context

Personal Screen Time currently presents one app selection with independent **A real step** and **Focus** switches. That makes selecting both look like one rule with unclear AND/OR behavior, even though they are separate reasons that may overlap. When a shield opens Kwilt, the app also forces a deep link into the condition owner's page. Money then renders its temporary-open control inside Budget Detail. The result is technically routed but disruptive: the person loses their place, and caregiver, child, and self-authored authority are not expressed in one coherent interaction.

## Target audience

Maya needs family rules that a child can predict and a caregiver can handle without reconstructing authority each time. Marcus needs self-authored guardrails that remain understandable and reversible without becoming a generic rules engine.

## Representative persona

Maya has set a meaningful access agreement for a child. When the child reaches a blocked app, the child should see the active boundary, while an authorized caregiver can deliberately manage the rule from its canonical surface. Marcus can follow one truthful prerequisite or manage his own rule without losing the page he was using in Kwilt.

## Aspirational design challenge

How might we make every Screen Time restriction read as one named agreement with one understandable way forward, while preserving the person's place in Kwilt and never giving a child caregiver authority?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` remains the demand spine. A restriction is useful only when it helps the person return to the intended action with less negotiation and less context switching.

## Job flow step

This improves Maya's **Family participation**, **Keep using the system**, and **Recover when plans change** steps in `job-flow-maya-move-family-life-forward`. Those steps remain under-delivered until family authority and child-device behavior are proven on signed devices.

## JTBD framing

When a selected app is paused, show the active agreement and the next legitimate action without shame or surprise. Keep the current Kwilt context visible. Give an authorized adult a deliberate management path, while keeping both direct override and rule management out of a child's guide.

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

- **Self-authored personal or Money rule:** the adult may keep the rule, take one exact prerequisite when it resolves the full blocking set, or follow **Manage rules ›**.
- **Family rule, authorized owner or scoped caregiver:** the adult may keep the rule or follow **Manage rules ›** to the named child's canonical surface.
- **Family rule, child:** the child may see the boundary and an exact prerequisite when one is truthful. The child never receives rule management or a direct temporary-open action.
- **Family rule, unscoped caregiver or other household member:** the guide explains that an authorized caregiver is needed and exposes no management action.

Child access requests remain a distinct caregiver-decision workflow. They may notify a caregiver, but they never make the child's local guide equivalent to caregiver approval.

### Separate bounded-override workflows

The control plane may retain bounded-override records, RPCs, expiry, and reconciliation for separately owned caregiver decisions or access-request workflows. The contextual guide does not invoke those primitives, render a duration, or present an override receipt. Ordinary rule transitions never call global clear.

### Guide states

The guide is a light, inset card with the standard drawer anatomy and four resolution kinds:

1. **Actionable:** one resolved rule has one exact prerequisite that resolves the complete block.
2. **Boundary:** a time-, schedule-, or usage-based rule has no immediate prerequisite.
3. **Mixed:** multiple active rules cannot be resolved by one action.
4. **Unresolved:** at least one native restriction cannot be mapped truthfully.

Authorized adults may also receive a quiet **Manage rules ›** link. Ordinary content hugs its measured height; large text and overlapping rules use a near-full-height scrolling state.

The page behind the guide remains visually and interactively present. Toasts stay suppressed while the guide is visible so transient feedback does not compete with the decision.

### Handoff and privacy

The native shield action records a short-lived handoff containing stable restriction identifiers, rule/selection identity, semantic reason labels already supplied by Kwilt, and request time. It does not expose Apple app tokens or invent a readable installed-app inventory in JavaScript. Handoffs are consumed once and expire after two minutes.

## Success signal

People can explain why an app is paused and whether any immediate action can change it. A shield open preserves the last-viewed Kwilt page. Children cannot manage or self-approve, authorized adults can reach canonical management, and changing an active rule requires fresh platform authentication.

Proof requires domain tests for authority and overlap, Simulator proof of navigation preservation and guide hierarchy, and signed-device proof of shield handoff, platform authentication, active-rule reconciliation, and child denial. Simulator evidence alone does not prove Apple-effective enforcement.

## Open questions

- Whether a later release should let an authorized adult choose 10, 20, or 30 minutes from the guide.
- Whether child access requests should be offered from the guide after the direct-unblock behavior is proven, or remain in the family Screen Time surface.
- How much active-rule detail should be disclosed when more than two restrictions overlap.
