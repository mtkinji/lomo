# Learning Release: Budget Amount Adjustment

## Concept To Build
A category amount can be adjusted from Category settings through a focused plan-aware flow that shows the impact before saving.

## Capability Delta
Today, the user cannot:

- change a monthly category amount from the visible `Monthly amount` row
- understand whether the new amount leaves buffer, exceeds the living target, or cannot be checked yet

After this release, the user can:

- tap `Monthly amount` in Category settings
- enter a new base monthly amount
- see one impact sentence before saving
- save the amount as a deliberate user override

Still intentionally not supported:

- automatic rebalancing
- whole-plan drag allocation
- this-month-only exceptions
- generated category amounts based on low-confidence predictions

## User Experience
Maya opens `Housing settings`. In `Budget Plan`, `Monthly amount` shows `$2,400` with a chevron. Tapping it opens `Adjust amount`.

The flow shows the current amount, an amount input, and one consequence:

- `Raising Housing to $2,600 leaves $90 unassigned.`
- `Raising Housing to $2,800 puts planned categories $110 over target.`
- `Kwilt can save this amount, but needs current income before checking the living target.`

She can save, cancel, or choose `Review full plan` when the change creates or worsens an over-target state.

## Existing Product Relationship
This enhances Category settings without making Category settings own all plan balancing. It leaves Budget Detail as the current-reality surface and leaves global living-plan generation to `brief-auto-budget-from-living-target`.

## Buildable Slice
Must be real:

- `Monthly amount` row is actionable.
- A focused amount-adjustment flow exists.
- The new amount persists to the category budget.
- The flow computes planned category total before and after from available categories.
- The flow shows honest impact states for known target, over target, missing resource, and unknown target.
- User-edited amount is labeled as a user override when the data model supports it, or at minimum documented as such in code and brief.

Can be thin or temporary:

- Source receipt can start as `Set by you` or `Current plan amount`.
- `Review full plan` can route to a placeholder or Summary section if the global plan surface is not ready.
- Target impact can start from existing onboarding living target plus available income/resource data, with a missing-resource state when unavailable.

Intentionally excluded:

- suggested replacement amounts
- automatic adjustment of other categories
- month-specific one-off adjustments
- household member approval

## Release Channel
`TestFlight build`, after local simulator verification.

This is a core money-editing feature. It should be tested in the real app bundle before production, with a small set of known categories and target states.

## Brand-Goodwill Guardrails
- Always show the consequence before saving.
- Never imply bank-real-time truth when only local/DB data is available.
- Do not shame over-target plans.
- Keep copy concrete and reversible.
- Do not track merchant names, transaction amounts, or exact category amounts in analytics.

## Reversibility
The flow can be hidden by making `Monthly amount` read-only again and preserving the saved category amounts. No migration should be required for the first slice beyond ordinary budget amount storage.

## Permanent Product Threshold
Promote this to permanent capability when simulator/TestFlight review shows that users can change a category amount, explain the impact sentence, and trust that Kwilt did not silently rebalance the plan.
