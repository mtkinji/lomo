# Diverge: accounts-inventory-shell

## Alternative 1: Setup Wizard

Accounts opens straight into a linear Plaid setup flow. This is efficient for first run, but weak after the first connection because there is no durable inventory to inspect.

## Alternative 2: Connection Status Page

Accounts mostly shows provider health and sync status. This is useful for debugging, but too provider-shaped and not enough like a Kwilt object surface.

## Alternative 3: Account Object Inventory

Accounts shows financial accounts as inventory rows with connection health, lane assignment, sync recency, and a compact add action. It fits Kwilt mobile's object inventory pattern and makes setup feel reversible.

## Alternative 4: Lane-Scoped Account Setup

Users only connect or choose accounts inside a budget lane setup flow. This keeps context strong, but hides global trust/health information and makes later repair harder to find.

## Chosen direction

Use `Account Object Inventory` as the shell. Lane setup can still invoke account linking later, but the durable destination is Accounts.
