# Screen Time exception authorization — learning release

## Concept to build

Build a rule-aware Screen Time guide that never opens an app temporarily: it explains the active boundary, offers a real prerequisite only when one exists, and gives authorized adults a quiet link to manage the underlying rules with fresh authentication before any weakening change is saved.

## Capability delta

Today, the user cannot:

- trust that the Screen Time intervention will hold, because **Open for 20 minutes** is available in the same impulse moment;
- distinguish a rule with a concrete prerequisite from a schedule or usage boundary through the guide’s fixed action model;
- move from an affected family rule to its canonical caregiver management surface without first encountering the temporary-open path.

After this release, the user can:

- understand which rule or overlapping rules are keeping the selected app paused;
- act on a truthful prerequisite such as returning to Focus or reviewing Money evidence;
- see when a time-of-day or usage rule releases without being told to “do” something that does not exist;
- follow **Manage rules ›** as an authorized self-adult, owner, or scoped caregiver;
- rely on fresh native authentication before a rule is disabled, deleted, or otherwise weakened.

Still intentionally not supported:

- opening an app temporarily from the guide;
- a quick-exceptions preference or custom Kwilt passcode;
- child access to rule management;
- treating device possession or a shared-device credential as caregiver authority;
- a child-to-caregiver request flow in this slice;
- removal of the control plane’s bounded-override primitive from separately owned future caregiver workflows.

## User experience

The person attempts to open an app currently restricted by Kwilt. Kwilt returns to the last valid page and presents the existing root-level floating bottom guide.

The guide names the boundary and lists each active rule:

- When the complete active rule set has a concrete resolution, the guide offers one rule-derived primary action, such as **Return to Focus**.
- When a schedule, time-of-day condition, usage limit, unresolved restriction, or overlapping rule means the action would not restore access, the guide remains explanatory and does not invent a primary action.
- An authorized adult sees **Manage rules ›** as a quiet secondary link. Personal rules route to **Settings > Screen Time** or the exact personal editor; a scoped caregiver routes to the affected child’s canonical Household Screen Time surface. Several affected domains route to the overview rather than pretending one editor owns them all.
- A child or unauthorized household member sees neither temporary opening nor management.
- Closing the guide preserves the current page.

From management, saving a change that weakens protection invokes the platform-owned authentication prompt with device-credential fallback. Cancellation or failure leaves the rule and native enforcement unchanged.

## Creative direction

Use the reviewed [creative direction](03a-creative-direction.md) and [rendered guide states](mockups/guide-states-rendered.png).

Carry forward:

- content-hugging normal guide height;
- capped internal scrolling for large text and overlapping rules;
- explanation and rule condition as the dominant hierarchy;
- Sumi primary control only for a truthful prerequisite;
- Pine text-link treatment for adult management;
- no warning styling, lock theater, countdown, or override language.

The mockups are static composition evidence, not native layout or accessibility proof.

## Existing product relationship

This release enhances the existing `ScreenTimeUnlockGuide`, handoff projection, Settings Screen Time overview, personal rule builder, and family Screen Time management routes.

It replaces:

- the guide’s **Open for 20 minutes** branch;
- fixed **Do this first** labeling when the rule has no concrete prerequisite;
- guide-specific opening/applying/failure presentation that exists only for temporary opening.

It leaves unchanged:

- Apple shield handoff and last-page preservation;
- personal, Money, and family policy ownership;
- named native selections and overlapping AND enforcement;
- family desired/applied delivery receipts;
- the backend’s versioned bounded-override primitive where no guide path exposes it.

The accepted Screen Time control-plane and feature documentation must be updated so they no longer claim that the contextual guide offers a 20-minute opening.

## Buildable slice

### Must be real

- A pure guide-action projection that returns:
  - active rule summaries;
  - an optional typed prerequisite action only when it is truthful for the entire blocking set;
  - a rule-management destination only when the actor has authority for the affected subject/domain;
  - no temporary-open action for any actor.
- Trigger and handoff-reason mapping for Focus, real-step, Money, daily usage, time of day, composite, family agreement, unresolved, and overlapping-rule cases.
- Correct personal, Money, family-child, and multi-domain management routing.
- Removal of temporary-open callbacks, busy/result state, analytics, and feedback prompts from the guide host.
- Content-owned normal guide height plus capped scrolling/large-text behavior using shared BottomGuide and drawer primitives.
- A shared Screen Time rule-change authentication boundary using `expo-local-authentication`, device fallback, and neutral Screen Time copy—not the Money-specific helper.
- Authentication immediately before personal or family mutations that weaken protection, including disabling, deleting, deactivating, or saving a less restrictive rule.
- No-change behavior for cancelled, failed, unavailable, stale-version, or rejected native/backend writes.
- Regression coverage for actor authority, trigger-derived actions, overlapping restrictions, destinations, authentication outcomes, and untouched unrelated rules.
- Focused local verification and an entitlement-enabled physical-iPhone walkthrough of the real shield handoff.

### Can be thin or temporary

- The first-build explanation for removal of temporary opening may be omitted if the resulting guide is self-explanatory during Andrew-only evaluation.
- Existing persisted `temporaryOpenAllowed`, `temporaryOpen`, and expiry fields may remain readable for backward compatibility while becoming inert in this guide.
- Existing temporary-override commands may remain in the control plane as unreachable infrastructure from this surface.
- Instrumentation may initially use the current guide events with revised properties, provided event names do not falsely claim a temporary opening occurred.

### Intentionally excluded

- New rule settings, dashboards, notifications, receipts, or cooldowns.
- Authentication-session caching across multiple rule changes.
- Remote caregiver approval or a child request workflow.
- Refactoring every Screen Time override command merely because the guide stops using it.
- Changes to the 20-minute duration used by separately owned bounded overrides.
- TestFlight, production rollout, or release claims before physical-device behavior is observed.

## Release channel

**Local build on one entitlement-enabled physical iPhone, Andrew-only.**

The Simulator remains useful for layout, actor-state fixtures, and large-text inspection, but it cannot prove Apple Screen Time enforcement or the shield-extension return. The first truthful learning release is therefore a development build installed on the physical device that owns the relevant Screen Time authorization.

Move to TestFlight only after:

- personal and family actor states route correctly;
- rule-weakening authentication is observed with success, cancellation, and failure/no-change outcomes;
- the physical shield flow never exposes temporary opening;
- large text and overlapping rules remain usable;
- the current page and unrelated restrictions are preserved.

## Brand-goodwill guardrails

- No release to external users while a legitimate rule can become unmanageable or a child can reach caregiver controls.
- No copy that frames the user as failing, cheating, or lacking discipline.
- No generic **Do this first** when Kwilt cannot identify a real action.
- No prominent management control that visually recommends weakening the rule.
- No authentication prompt before merely viewing or understanding a rule; authenticate only at a weakening mutation boundary.
- No claim that a family change is applied until the child device acknowledges the new policy version.

## Reversibility

The first release avoids destructive data rewrites. Existing temporary-opening fields remain compatibility input but are ignored by the guide projection. The UI and routing change can be reverted in a later local build without reconstructing rule definitions.

Authentication is added around existing mutations rather than changing their persisted shape. A rollback removes the new gate and guide projection while leaving rule records intact. Any analytics additions must be additive and tolerate older clients.

Do not delete backend override tables, RPCs, or historic receipts in this slice. Their removal would make rollback harder and would exceed the guide decision.

## Permanent product threshold

Promote this to the accepted product contract only after physical-device evaluation shows that:

- the guide remains understandable without **Open for 20 minutes**;
- users can distinguish actionable prerequisites from boundaries that simply remain in force;
- authorized adults reliably reach the correct management owner;
- fresh authentication prevents accidental weakening without creating lockout or repeated-prompt fatigue;
- child and shared-device authority boundaries hold;
- no unrelated rule or native selection is cleared;
- compact, large-text, and overlapping-rule layouts remain stable.

If the management path proves too indirect, first improve destination specificity and return behavior. Do not restore a hot-path temporary opening unless evidence shows the recovery problem cannot be solved in canonical rule management.
