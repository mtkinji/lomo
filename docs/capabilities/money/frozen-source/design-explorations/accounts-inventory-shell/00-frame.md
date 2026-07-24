# Frame: accounts-inventory-shell

## What the user said

> add an "Accounts" nav item in Kwilt Money. This is where users will go to setup their linked accounts. Run a design loop to arrive at a position on how that workflow should go. Use our standard object inventory page style from the Kwilt mobile app. The budget app should reuse that standard object inventory page type. I want a code accurate representation of it as a shell

## Target audience

`audience-aspirational-family-organizers`: households trying to become more organized without adopting a finance methodology.

## Representative persona

Maya wants the meter to feel current and trustworthy without turning Kwilt Money into a banking dashboard.

## Hero anchor

`jtbd-trust-this-app-with-my-life` - linked accounts are a high-trust setup surface.

## Job flow step

`job-flow-maya-review-budget-reality-before-spending`, step 2: connect spending data to the right lane. Current delivery is partial: Plaid Link exists as a compact action on Budget, but linked accounts do not yet have their own object inventory.

## System alignment

Constraint posture: `Fit the system`.

Current system facts:
- Kwilt Money already has Expo Router tabs, `KwiltPage`, fixture provider state, Plaid Link setup, and transaction-backed budget rows.
- Kwilt mobile's object inventory pattern is a list-first working surface: page title, compact control row, count/status metadata, object rows/cards, and local setup actions.
- Accounts should explain connection health and lane assignment, not expose raw Plaid/provider internals.

Design implication: Accounts should become the setup and inspection inventory for financial account objects. Budget can stay focused on meters.

## Aspirational design challenge

How might we help Maya set up trustworthy linked accounts for her budget meters, while preserving Kwilt's calm object-inventory shell and avoiding a finance dashboard?

## Out of scope

Full account-detail editing, Plaid repair flows, token exchange, account removal, and production bank-management edge cases.
