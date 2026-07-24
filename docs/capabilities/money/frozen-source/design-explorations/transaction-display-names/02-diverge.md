# Diverge: transaction-display-names

## Axis Of Variation

User-owned naming vs. system-suggested cleanup, and one-off correction vs. reusable rule.

## Alternative 1: Personal Display Name

The transaction detail page gets a small "Name" edit affordance near the title. Saving creates a user-owned display name for this transaction. Lists and activity rows show the display name; detail shows the raw bank description as source evidence.

- Audience/persona fit: strong for Maya because it respects truth while removing daily annoyance.
- Design-challenge answer: makes the unreadable name recognizable without changing source evidence.
- System-fit note: extends transaction review persistence with a display-name override.
- Best when: the ugly name is rare or the user wants a very specific label.
- Fails when: the same messy ACH source repeats every month and the user must rename it repeatedly.
- Anti-pattern check: avoids dashboard clutter and fake AI certainty.

## Alternative 2: Name Similar Transactions

After the user edits a display name, Kwilt offers "Use for similar names." The rule is separate from category rules and uses the same merchant-key matching posture. Future matching rows show the preferred display name while detail keeps raw evidence.

- Audience/persona fit: strong when rent, payroll, or utility descriptors repeat.
- Design-challenge answer: one correction carries forward without hiding evidence.
- System-fit note: adds a companion display-name rule model.
- Best when: source descriptors are recurring and stable enough to match safely.
- Fails when: the matching phrase is too broad and unrelated transactions inherit the name.
- Anti-pattern check: pass if previewed before save and reversible.

## Alternative 3: Source-Aware Title Split

Do not persist anything yet. Change the detail hierarchy so the title is a cleaned, heuristic label when possible, and the raw descriptor is labeled "Bank description" below. If the heuristic cannot produce a calmer label, keep the raw name.

- Audience/persona fit: useful for reducing immediate visual pain.
- Design-challenge answer: improves the first impression while preserving raw detail.
- System-fit note: mostly UI-only; no persistence required.
- Best when: Plaid data contains an obvious merchant or source string.
- Fails when: the heuristic is wrong or creates a name that sounds more certain than the data.
- Anti-pattern check: risk of fake certainty unless labels are conservative.

## Alternative 4: Category-Context Label

Show a contextual label like "Housing deposit" or "Rent payment" derived from category, direction, and amount pattern, while preserving raw merchant underneath.

- Audience/persona fit: can be helpful in budget activity because the user cares why it counts.
- Design-challenge answer: ties legibility directly to budget reality.
- System-fit note: uses existing category and transaction direction, but risks blending naming with classification.
- Best when: the user is scanning a category detail surface.
- Fails when: category assignment is wrong or the row is an inflow/refund with ambiguous meaning.
- Anti-pattern check: medium risk; it can sound like advice or invented semantics.

## Alternative 5: Leave Evidence Untouched, Add Note

The user can attach a private note to the transaction, but the title remains the source name.

- Audience/persona fit: weak for this complaint because the primary label stays terrible.
- Design-challenge answer: preserves truth, but does not make the screen scannable.
- System-fit note: would add a note model without solving display naming.
- Best when: the user wants audit context, receipts, or memo detail.
- Fails when: the actual job is "make this name readable."
- Anti-pattern check: likely clutter for the first slice.
