# Diverge: Category Budget Planning

## Axis
Maintenance-first versus planning-first, with the question of whether amount editing is a setting, a contextual plan action, or a guided rebalance.

## Alternative A: Settings Owns All Budget Plan Fields
Category settings gains a Budget Plan group with Name, Monthly amount, and Rollover. Budget Detail sends all edit affordances there.

Audience/persona fit: good for calm maintenance, weaker for living-target consequences.  
Design-challenge answer: clearly separates settings from detail, but risks treating amount as a simple setting.  
System-fit note: high; reuses current settings page and `updateBudget`.  
Best when: the near-term goal is deleting duplicate surfaces.  
Fails when: Maya expects to understand what changing the amount does to the whole plan.  
Anti-pattern check: pass if Monthly amount is labeled as a future planning link, not over-explained inline.

## Alternative B: Budget Detail Adjust Amount Sheet
Budget Detail drops the generic drawer and later adds a focused `Adjust amount` sheet from the meter, showing current amount, suggested amount, reason, living-target impact, and save.

Audience/persona fit: strongest for amount changes, because it happens where the user sees category reality.  
Design-challenge answer: cleanly distinguishes plan changes from settings.  
System-fit note: medium; needs living-target receipts before the sheet is truthful.  
Best when: the app has target-backed allocation data.  
Fails when: shipped before it can show impact, becoming another plain dollar input.  
Anti-pattern check: pass if it does one job and avoids full rebalancing UI.

## Alternative C: Rebalance Plan Page
A dedicated planning page shows all category allocations against the monthly living target, with drag or stepper changes and automatic reconciliation.

Audience/persona fit: useful for power planning, but too finance-heavy for the current value unit.  
Design-challenge answer: answers plan impact fully, but risks making Kwilt Money feel like a budget app first.  
System-fit note: low; requires first-class MonthlyLivingPlan and broad new UI.  
Best when: planning becomes the primary product moment.  
Fails when: Maya only wants one category to feel trustworthy before spending.  
Anti-pattern check: warning; likely dashboard pressure.

## Alternative D: Receipt-Only Amount Explanation
Do not edit the amount yet. Budget Detail adds a small receipt line explaining where the amount came from, and Category settings handles only behavior.

Audience/persona fit: good for trust, but does not meet the need to change an amount.  
Design-challenge answer: clarifies meaning without adding controls.  
System-fit note: medium; needs source receipts or careful static copy.  
Best when: learning focuses on comprehension before control.  
Fails when: Maya sees a bad amount and cannot fix it.  
Anti-pattern check: pass if it stays small.
