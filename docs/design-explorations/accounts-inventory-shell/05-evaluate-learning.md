# Evaluate Learning: accounts-inventory-shell

## Learning questions

1. Does Accounts feel like the natural place to set up linked accounts?
2. Does the inventory row make connection health and meter purpose clear without a finance dashboard?
3. Does moving setup out of Budget make Budget feel cleaner?
4. Is lane assignment the right primary account metadata, or should account rows emphasize institution and account type more?

## Evidence

- Visual review of Accounts on device.
- Whether the add and sync actions are discoverable.
- Whether the user can explain what `Needs lane` means.
- Whether Budget still has too much account setup copy after this shell exists.

## Decision rule

If the shell feels right, wire account persistence, token exchange, and lane assignment into this route. If it feels too detached from the moment users create lanes, keep Accounts as status/repair and make lane setup the main activation path.
