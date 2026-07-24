# Converge: transaction-display-names

## Scoring

| Alternative | Persona fit | System fit | Trust | Blast radius | Verdict |
| --- | --- | --- | --- | --- | --- |
| Personal Display Name | High | Medium | High | Medium | Lead |
| Name Similar Transactions | High | Medium | Medium | Medium-high | Add as invited extension |
| Source-Aware Title Split | Medium | High | Medium | Low | Useful fallback, not enough |
| Category-Context Label | Medium | Medium | Low-medium | Medium | Defer |
| Private Note | Low | Medium | High | Medium | Reject |

## Chosen Alternative

Build **Personal Display Name**, with an invited "use for similar names" option if the implementation can preview matches clearly.

## Capability Delta

Today, the user cannot:

- Replace a hostile provider fallback name with a recognizable personal label.
- Keep raw bank evidence visible while using a friendlier display name.
- Make a recurring ugly ACH descriptor readable in future activity.

After this ships, the user can:

- Rename the displayed transaction label for herself.
- Still inspect the exact bank description on the detail page.
- Optionally apply the preferred name to similar future transactions.

Still intentionally not possible:

- Edit the bank-provided source descriptor.
- Let a display name change category matching or budget totals.
- Publish or share a household-wide naming policy.
- Ask AI to invent transaction labels automatically.

## Reductive Design Decisions

- Enhance the existing transaction detail page instead of adding a naming settings screen.
- Keep source evidence below the title instead of hiding it behind a modal.
- Use one compact edit interaction, not a full transaction metadata editor.
- Refuse note-taking, receipts, AI enrichment, and category-context labels in the first slice.
- Keep the already-shipped category picker visually separate from name correction.

## Activation Path

Activation should happen only when the user is already looking at a bad name:

- Detail title has a small edit affordance.
- If a saved display name exists, show it as the title and label the source text as `Bank description`.
- If the user saves a name and similar unreviewed rows exist, offer a calm follow-up to use that display name for similar names.

No onboarding, tooltip tour, or promotional copy is needed.

## Bug Fix From This Loop

The current transaction detail page should not show "Not in a budget" while a category is selected. The secondary action should read as a removal action when selected and as "Not in a budget" only when no category is selected.

## Bet

We're betting that user-owned display names will make real transaction evidence feel more trustworthy, not less. If users start treating display names as source truth or matching becomes confusing, revisit by limiting the feature to one-off names and making raw evidence more prominent.

## Success Signal

In self-use or TestFlight, a user can rename an ugly transaction, later recognize it in transaction/activity lists, and still find the original bank descriptor without wondering whether Kwilt altered financial evidence.
