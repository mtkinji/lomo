# Converge: accounts-inventory-shell

## Product position

Accounts is the object inventory for linked financial accounts. Users go there to connect an account, see whether the connection is healthy, sync it, and understand which budget lanes it currently feeds.

## Reductive decisions

- Add one nav item: `Accounts`.
- Use one inventory page shell: header, view chips, sync action, source summary, account rows.
- Show lane assignment as account purpose, not bank-product detail.
- Keep Plaid Link as the add action, reusing the existing hook.
- Do not build account detail, removal, repair, or full Plaid exchange in this shell.

## Bet

We're betting that making linked accounts a first-class object inventory will make the budget meters feel more trustworthy without pulling users into a finance dashboard. If that feels too abstract, revisit by moving account setup into lane creation while keeping Accounts as the repair/status destination.

## Success signal

A user can point to Accounts and answer: what is connected, whether it synced, and which meters it supports.
