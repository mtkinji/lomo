# Learning Release: transaction-display-names

## Concept To Build

Let the user give an unreadable transaction a personal display name while keeping the exact bank description visible as source evidence.

## Capability Delta

Today, the user cannot:

- Make a hostile transaction name readable.
- Preserve the bank descriptor while using a personal label in activity rows.
- Carry a display-name correction forward to similar recurring transactions.

After this release, the user can:

- Tap to edit the transaction display name from the detail page.
- See the preferred name in transaction inventory and budget activity.
- See the raw source line labeled as the bank description.
- Optionally apply the preferred name to similar source names if match preview is included.

Still intentionally not supported:

- AI-created merchant names.
- Editing bank/Plaid source data.
- Display names changing categories, rules, forecasts, or totals.
- Notes, receipts, attachments, or household naming governance.

## User Experience

The user encounters this on transaction detail. The title remains the primary label. A small edit action opens an inline field or bottom sheet with the current display label, a save action, and a cancel action. The raw provider descriptor remains visible under the hero copy with source wording. After save, the page title and list rows use the display name.

If similar-name reuse is included, Kwilt shows a preview before saving the rule, using the same calm pattern as category match previews.

## Existing Product Relationship

This enhances transaction review. It does not replace category correction, similar merchant category rules, freshness labels, or budget meters.

## Buildable Slice

Must be real:

- Persisted user-specific display-name override.
- Detail, Transactions inventory, and budget detail activity render the preferred display name.
- Raw bank description remains accessible on detail.
- Rename does not affect category matching, rule matching, forecast, or totals.
- Removing or clearing a display name returns to the provider-derived label.

Can be thin or temporary:

- One-off transaction names can ship before similar-name rules.
- The edit UI can be a compact bottom sheet rather than a larger naming flow.
- Suggested cleaned names can be omitted from the first release.

Intentionally excluded:

- Auto-renaming without user action.
- AI enrichment.
- Notes and receipts.
- Cross-household shared display names.

## Release Channel

`TestFlight build` - the feature needs real connected transaction rows and real ugly provider descriptors to learn anything useful, but should stay inside the current internal release lane first.

## Brand-Goodwill Guardrails

- Label raw evidence plainly.
- Never imply Kwilt changed the bank transaction.
- Keep user changes reversible.
- Keep category and display-name changes visually separate.
- Do not collect analytics with merchant names, raw descriptions, amounts, or account masks.

## Reversibility

Hide the edit affordance and ignore overrides at render time. If stored in a separate override table, source transactions remain untouched and rollback does not change budget math.

## Permanent Product Threshold

Promote this beyond a learning release if internal/TestFlight use shows that renamed transactions are easier to recognize later, users still trust the raw evidence, and similar-name reuse does not create confusing overmatches.
