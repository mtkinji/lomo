# Learning Release: accounts-inventory-shell

## Concept To Build

Add an Accounts tab that presents linked financial accounts as Kwilt-style inventory objects.

## Capability Delta

Today, the user can start Plaid Link from a Budget card, but cannot see connected accounts as a reusable setup surface.

After this release, the user can open Accounts, start account linking, sync fixture data, filter accounts by status, and see which budget lanes each account feeds.

Still intentionally not supported:
- account detail editing
- account removal
- Plaid repair mode
- production token exchange completion
- multi-institution management

## User Experience

The user taps Accounts in the bottom nav. The page shows a compact inventory header, view chips, a Sync action, a provider summary, and account rows. The add button opens the existing Plaid Link path.

## Release Channel

Local build. This is a shell and product-positioning slice around existing Plaid scaffolding.

## Permanent Product Threshold

Promote this from shell to accepted product when account linking, server-side token exchange, persistence, and lane assignment can all complete without fixture data.
