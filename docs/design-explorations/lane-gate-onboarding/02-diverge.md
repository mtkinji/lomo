# Diverge: lane-gate-onboarding

## Axis of variation

The useful variation is the setup entry point:

- budget-first,
- app-first,
- lane-plus-controls,
- bank-first,
- or value-first demo before permissions.

## Alternative 1: App-First Gate Setup

The user starts by selecting the spending app/site that causes drift, using FamilyControls selection early. Kwilt asks what lane should appear before that app opens, then helps create or choose the lane and connect transactions.

Persona fit: strong for users who know the problem app.

Design-challenge answer: starts from the impulse moment.

System fit: maps cleanly to `AppGateRule`, then lane creation and inference hints.

Best when: the target is obvious, like DoorDash, Amazon, Target, or Uber Eats.

Fails when: the user thinks in budget contexts first, such as "kids activities" or "groceries."

Anti-pattern check: risk of feeling like parental controls if app shielding appears before the value is clear.

## Alternative 2: Budget-First Lane Setup

The user creates a simple budget lane first: name, amount, and period. Kwilt shows the meter immediately, then offers add-ons: connect transactions to keep it current, and choose apps/sites that should wait behind this lane.

Persona fit: strong for Maya because it starts with household language and trust.

Design-challenge answer: starts with the user's intent before asking for bank or app-control permissions.

System fit: maps cleanly to `BudgetLane`, `LaneInferenceHint`, `AssignmentSuggestion`, then `AppGateRule`.

Best when: the user is expressing a budget boundary, such as "shopping at $100/month."

Fails when: the user wants immediate app blocking and finds budget setup too gentle.

Anti-pattern check: passes if lane creation is tiny; fails if it turns into full budget planning.

## Alternative 3: Bank-First Auto-Discovery

The user connects a bank account first. Kwilt scans transactions and proposes lanes and app mappings based on merchants/categories.

Persona fit: mixed. It is impressive, but bank-first can feel invasive before the user has named the job.

Design-challenge answer: reduces manual setup, but weakens user ownership.

System fit: requires broader inference, more transaction visibility, and stronger privacy explanation.

Best when: the app already has enough trust to ask for transaction access.

Fails when: the user has not yet understood why bank access is needed.

Anti-pattern check: high risk of feeling like surveillance or generic budgeting.

## Alternative 4: Demo-First Guided Rule

The app shows a local example rule first: "Show Takeout before DoorDash." The user can try the review flow with fixture data, then replace the demo with real lane/app/account setup.

Persona fit: strong for learning the concept, weaker for users ready to configure immediately.

Design-challenge answer: makes the value concrete before permissions.

System fit: reuses the existing fixture meter and review screen.

Best when: first-run comprehension is the riskiest unknown.

Fails when: the user wants to get straight to real setup.

Anti-pattern check: pass if the demo is short and clearly temporary.

## Alternative 5: Checklist Setup

The app presents a concise checklist: create lane, connect transactions, choose app/site, activate rule. The user can complete steps in any order, and incomplete rules are clearly marked.

Persona fit: moderate. It is transparent, but may feel like project management.

Design-challenge answer: handles platform complexity without hiding it.

System fit: requires `SetupState` and incomplete-rule handling.

Best when: permissions or Plaid setup may fail and recovery matters.

Fails when: the checklist feels like configuration work.

Anti-pattern check: avoid productivity-app tone; use plain state, not tasks.
