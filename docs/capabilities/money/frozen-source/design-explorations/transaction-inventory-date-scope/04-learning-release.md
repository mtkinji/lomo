# Learning Release: transaction-inventory-date-scope

## Concept To Build

Transactions becomes a complete ledger inventory with a visible current-month date scope.

## Capability Delta

Today, the user cannot:
- Inspect historical Plaid rows from the Transactions tab.
- Tell why transaction rows are hidden.
- Rely on onboarding to request more than a small transaction history window.

After this release, the user can:
- Connect a Plaid account that requests up to 730 days of history.
- Open Transactions and see the current month scope by default.
- Change the scope to `Last 30 days`, `Last 12 months`, or `All history`.
- Keep budget meters scoped to the current period.

Still intentionally not supported:
- Custom date range picker.
- Reports.
- Export.
- Persisted filter presets.

## User Experience

The user opens Transactions. The control row contains date scope, filter, and sort. A concise line names the source and active date scope. Rows are grouped by day. The count shows visible rows over the loaded transaction inventory.

If the selected date scope is empty but historical rows exist, the empty state says there are no transactions in that scope, not that there are no transactions at all.

## Existing Product Relationship

Enhances the existing Transactions tab and Plaid Link setup. Leaves Accounts as the connection inventory. Leaves Budget and Budget Detail current-period focused.

## Buildable Slice

Must be real:
- Plaid Link token requests `transactions.days_requested: 730` by default.
- Live snapshot exposes all loaded rows and current-period rows separately.
- Transactions tab uses all loaded rows for inventory and date scope filters them.
- Date scope control follows the existing inventory menu pattern.

Can be thin or temporary:
- Date scope presets only.
- No saved preference.
- `All history` means all rows loaded from the app's configured Plaid/Supabase history window.

Intentionally excluded:
- Custom range UI.
- New analytics cards.
- Full reporting model.

## Release Channel

Local build/TestFlight. The feature affects live financial data display but is reversible and uses existing surfaces.

## Brand-Goodwill Guardrails

- Never show `0 / 0` when historical rows are loaded.
- Make active scope visible.
- Keep copy literal and non-judgmental.
- Avoid dashboard language.

## Reversibility

The UI can remove the date-scope control and keep all rows sorted newest first. The Plaid history request default can be reduced for future Items, but already-created Items keep their original history depth.

## Permanent Product Threshold

Keep the pattern if it makes live Sandbox/self-use clearer and does not create pressure to add reporting controls. Expand only if users ask for custom date windows or export.
