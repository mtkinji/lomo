# Diverge: Where Advanced Screen Time Begins

## Fixed frame

Kwilt keeps a complete local Apple-like Screen Time baseline Free. Managed
Household coordination is Pro even when the underlying rule is simple.
Advanced local controls may also be Pro, but the boundary must describe value
Kwilt creates rather than the amount or strictness of Apple-backed enforcement.

## Axis of variation

The alternatives differ in the **source of paid value**:

1. Kwilt-maintained condition truth.
2. Rule-composition complexity.
3. Assisted creation and ongoing intelligence.
4. The entitlement of the underlying Kwilt capability.

Every alternative holds the coordination-topology boundary constant: named
dependent binding, remote caregivers, cross-device delivery, requests,
receipts, and managed recovery are Pro.

## Alternative A: Kwilt Truth Boundary

### Sketch

Local rules using only static time, schedule, usage allowance, and selected
apps remain Free. A rule becomes Pro when it depends on a fact or policy engine
Kwilt maintains: an Activity or responsibility, Money review, earned balance,
prerequisite-app state, family-day state, reviewed exception, or another
Kwilt-owned condition. Explicit AND/OR composition is Pro when at least one
condition is Kwilt-owned; combining only Apple-like time and usage facts remains
Free. Managed Household coordination is independently Pro.

### Audience and persona fit

Strong fit for Maya. She can test an ordinary local guardrail, while the family
rhythm she actually wants—responsibilities first, shared caregiver authority,
and reliable remote delivery—clearly belongs to Kwilt Pro.

### Design-challenge answer

Payment follows the developer-created truth that changes the agreement, not
the picker, minutes, app count, schedule count, or native shield.

### System fit

- Constraint posture: `Bend the system`.
- Refines `classifyPersonalRuleAccess` from condition-count classification to
  condition-source classification.
- Replaces the all-or-nothing family action gate with separate local-starter and
  managed-Household policies.
- Keeps Screen Time as rule owner; Activities and Money only supply typed
  condition truth.

### Four-object and capture-first posture

Activities remain the atomic record of doing and can be captured without a
Screen Time or Pro decision. Goals, Arcs, and Chapters remain uninvolved. Pro
controls may reference Activity completion but never turn Activities into
points, currency, or required Goal attachments.

### Best when

- Kwilt wants one durable explanation of what makes a control advanced.
- Cross-capability conditions are the signature differentiated experience.
- App Review and customer copy need the same legible distinction.

### Fails when

- Users perceive a single Activity condition as too small to justify Pro.
- The product markets generic blocking rather than the Kwilt-maintained
  condition and family outcome.
- Rule classification leaks implementation jargon into the UI.

### Primer anti-pattern check

Passes if conditions remain deterministic, legible, non-scored, and reversible.
Fails if activity completion becomes a gamified reward market or if AI decides
whether a child deserves access.

## Alternative B: Composition Boundary

### Sketch

Each Free rule may contain exactly one standard condition: Focus, time of day,
or daily usage. Any second condition, connector, nested condition group, or
cross-domain predicate makes the rule Pro. Managed Household coordination is
also Pro. This closely preserves the current access classifier and is easiest
to implement and explain internally: one condition is basic; composed logic is
advanced.

### Audience and persona fit

Moderate fit. Maya can understand a simple rule, but the boundary may feel
arbitrary when two ordinary settings—such as after 4:00 and under 30 minutes—
cross a paywall even though Apple exposes similar controls.

### Design-challenge answer

Payment unlocks Kwilt's rule composer, regardless of where the underlying
condition facts originate.

### System fit

- Constraint posture: `Fit the system` for personal rules; `Bend the system`
  only for the family starter.
- Preserves the existing condition-count classifier and most paywall points.
- Requires the smallest source migration.

### Four-object and capture-first posture

The object model remains intact and Activity capture stays free. A single
Activity prerequisite would still be Pro because its condition type is
Kwilt-linked; the main ambiguity concerns two Apple-like conditions.

### Best when

- Implementation continuity and a very simple internal rule are dominant.
- Market evidence gives confidence that paid composition will pass review.

### Fails when

- App Review interprets the second condition as monetizing Screen Time APIs.
- Customers experience the line as an arbitrary feature-count restriction.
- Pricing copy leads with multi-condition blocking rather than a Kwilt outcome.

### Primer anti-pattern check

Passes on product-model integrity, but risks violating Kwilt's honest-pricing
bar because the condition-count boundary is structural scarcity rather than a
clear change in delivered value.

## Alternative C: Assisted Intelligence Boundary

### Sketch

All device-local rule authoring and enforcement remain Free, including composed
and cross-domain rules. Pro sells the assistance around those rules: Chat
creation and revision, recommended agreements, reusable family templates,
simulation, history, proactive conflict detection, and managed Household
coordination. The rule engine is treated as substrate; the ongoing intelligent
service is the product.

### Audience and persona fit

Mixed fit. Maya receives generous local controls and pays when she wants Kwilt
to reduce administration. However, she may not value templates, simulation, or
history nearly as much as the actual automated rule outcome.

### Design-challenge answer

The paid product is help designing and maintaining an agreement, while the
Apple-backed enforcement path remains universally available.

### System fit

- Constraint posture: `Question the system`.
- Removes advanced-rule entitlement checks from authoring and enforcement.
- Introduces new paid surfaces that are not yet the main source of demonstrated
  Screen Time value.
- Keeps Household topology Pro.

### Four-object and capture-first posture

Capture remains free and the four-object model stays unchanged. Recommendations
must propose rather than silently create Activity-linked rules, and Chat writes
still require explicit review.

### Best when

- Minimizing Guideline 4.10 exposure outweighs monetizing advanced personal
  controls.
- Users demonstrate willingness to pay for administration help and history.

### Fails when

- Assisted authoring is occasional rather than recurring value.
- Templates and analytics add clutter to a surface that should stay calm.
- Pro sounds like convenience frosting on a product whose core value is Free.

### Primer anti-pattern check

Passes only if assistance stays sparse, proposal-based, and non-promotional.
Fails if Kwilt adds a policy dashboard, constant recommendations, or
anthropomorphic family coaching.

## Alternative D: Underlying Capability Boundary

### Sketch

Screen Time never independently decides whether a local rule is Pro. A rule is
available when all of its source capabilities are available: time, usage,
Focus, and Activities are Free; a Money condition requires Money's Pro access;
future paid connected services carry their own entitlement. Managed Household
coordination remains Pro because Household management is itself the paid
service. Composition does not add another entitlement.

### Audience and persona fit

Moderate-to-strong fit. The explanation is concrete—payment follows the paid
source service—but two visually similar advanced rules can have different
access depending on their inputs. An Activity-first rule would be Free while a
Money-review rule would be Pro.

### Design-challenge answer

Screen Time consumes capability truth without reselling it. Customers pay for
Money connectivity or Household coordination, not for using that truth in a
shield.

### System fit

- Constraint posture: `Bend the system`.
- Replaces `advanced_screen_time_rules` with source-capability entitlement
  composition.
- Simplifies Screen Time marketing but complicates draft validation and
  downgrade behavior when one condition source becomes unavailable.

### Four-object and capture-first posture

Activities and their Screen Time use remain Free, so capture is never gated.
Money truth remains owned by Money. No new Arc, Goal, Activity, or Chapter
semantics are introduced.

### Best when

- Kwilt wants the clearest claim that Screen Time itself is not monetized.
- Paid connected capabilities already carry enough commercial value.

### Fails when

- Advanced personal Screen Time is expected to be a headline Pro pillar.
- Mixed-entitlement rules produce confusing editor and downgrade states.
- Free Activity-linked automation gives away too much of the distinctive
  control experience.

### Primer anti-pattern check

Passes the honest-pricing and object-ownership bars. Risks complexity in
explanations, but does not inherently introduce a Kwilt anti-pattern.

## Comparative read

| Alternative | What makes a local rule Pro? | Customer clarity | App Review posture | Revenue strength | System change |
| --- | --- | --- | --- | --- | --- |
| A. Kwilt Truth | Kwilt-owned condition or policy logic | Strong | Strongest balanced posture | Strong | Medium |
| B. Composition | A second condition or advanced connector | Simple but arbitrary | Weakest | Strong | Low |
| C. Assisted Intelligence | Assistance, analysis, or managed service; rules stay Free | Moderate | Strongest conservative posture | Unproven | High |
| D. Underlying Capability | A paid source capability or managed Household | Concrete but uneven | Very strong | Medium | Medium-high |

## Divergence checkpoint

Alternative A most directly expresses the aligned two-axis frame without yet
being selected. The consequential choice is whether a rule composed only from
Apple-like time and usage facts stays Free (A) or becomes Pro merely because it
has multiple conditions (B). Alternatives C and D preserve credible fallback
directions if review risk or customer comprehension later disproves the chosen
boundary.
