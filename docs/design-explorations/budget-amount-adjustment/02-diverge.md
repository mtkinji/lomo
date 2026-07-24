# Diverge: Budget Amount Adjustment

## Axis
Local control versus global planning, and whether the first release should prioritize immediate editability, plan truth, or full allocation balance.

## Alternative A: Category Settings Inline Amount
The `Monthly amount` row becomes a simple editable field or bottom sheet in Category settings. The user enters a new number and saves.

Audience/persona fit: medium; it gives control quickly, but underserves Maya's need to understand consequences.  
Design-challenge answer: helps her fix a wrong number from the place she notices it, but does not preserve whole-plan trust.  
System-fit note: high technically; low product-truth fit because it treats the amount as an isolated setting.  
Best when: the app needs the fastest possible amount editing.  
Fails when: a saved amount makes Summary, living target, or other categories feel inconsistent.  
Anti-pattern check: warning; too finance-form-like and too easy to make a high-trust edit feel casual.

## Alternative B: Global Plan Settings
A global Budget Plan or Living Target screen owns all category amounts. Category settings keeps `Monthly amount` as read-only and links to the global screen.

Audience/persona fit: medium; it respects balance but may feel heavy when Maya only wants to fix Housing.  
Design-challenge answer: preserves plan integrity, but starts from the system's structure rather than the user's moment of noticing.  
System-fit note: medium-low; depends on a fuller `MonthlyLivingPlan` surface that is not built yet.  
Best when: the product is ready to make planning a primary app surface.  
Fails when: users feel routed away from the category into a global budget dashboard.  
Anti-pattern check: warning; risks making Budget feel like a finance app first.

## Alternative C: Category-Started Plan Adjustment
The `Monthly amount` row in Category settings becomes actionable. Tapping opens a focused `Adjust amount` flow for that category. The flow shows current amount, new amount, source receipt when available, and one whole-plan impact sentence: buffer remaining, over-target amount, or missing-resource caveat. It includes `Review full plan` only when the impact suggests broader tradeoffs.

Audience/persona fit: high; Maya starts where the problem is and sees the consequence before saving.  
Design-challenge answer: fixes the wrong category amount while preserving trust that the saved number belongs to the plan.  
System-fit note: medium; extends current settings without requiring a full global planner first.  
Best when: we can compute at least total planned categories, target/buffer when known, and over-target state.  
Fails when: the target-impact signal is fake, stale, or based on missing income without saying so.  
Anti-pattern check: pass if it stays focused and does not silently rebalance.

## Alternative D: Detail Meter Adjustment Prompt
Budget Detail shows `Adjust amount` near the meter when the category appears unrealistic: near limit early, repeatedly over, or manually selected by the user. Category settings keeps amount read-only.

Audience/persona fit: high for contextual learning, lower for predictable maintenance.  
Design-challenge answer: activates at the strongest moment, but may hide a basic maintenance capability.  
System-fit note: medium; Budget Detail is already the reality surface.  
Best when: amount changes should be triggered by evidence, not settings browsing.  
Fails when: users go to settings looking for the basic edit and cannot find it.  
Anti-pattern check: pass only if it supplements, not replaces, a clear settings affordance.

## Alternative E: Two-Mode Amount Change
The user chooses `Change base amount` or `This month only`. Base amount affects future months; this-month adjustment affects current available room.

Audience/persona fit: promising, but conceptually heavier.  
Design-challenge answer: solves a real distinction, but absorbs rollover/month-scope complexity into the first edit release.  
System-fit note: medium-low; needs more durable month-specific budget math.  
Best when: month-scoped planning and rollovers are already proven.  
Fails when: the first amount-edit interaction becomes a mini accounting system.  
Anti-pattern check: defer; it is too much for the first learning slice.
