---
id: brief-money-transaction-notes
title: Household notes on Money transactions
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
serves: [jtbd-review-budget-reality-before-spending, jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
related_briefs: [transaction-display-names, kwilt-money-capability-integration]
owner: andrew
last_updated: 2026-08-31
---

# Household notes on Money transactions

## Context

Provider descriptions such as “Venmo” can be accurate but insufficient. A household may need to remember that a large transfer paid for family pictures without changing the provider record or inventing a financial classification.

## Target audience

Aspirational family organizers want recognizable household money without maintaining a finance system.

## Representative persona

Maya sees the correct amount, date, and account for a Venmo charge, but only her family knows what it paid for.

## Aspirational design challenge

How might we help Maya preserve the family meaning of a purchase in seconds, while keeping provider truth and Money decisions distinct?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — ordinary family commitments stay understandable and actionable.

## Job flow step

Improve step 7 of `job-flow-maya-review-budget-reality-before-spending`: inspect or correct transaction meaning only when materially useful. Current delivery is 4, but household-specific context cannot be preserved.

## JTBD framing

When a bank description does not explain a household purchase, Maya wants to add the context her family will recognize later, so transaction review does not become detective work. This serves trustworthy review, lightweight capture, and confidence in shared Money data.

## Design

- Add nullable `user_note` to `budget_transactions`, normalized to trimmed text or null and limited to 500 characters.
- Keep the existing household select/update policy. Grant authenticated clients update access only to the new column in addition to existing reviewed fields.
- Project the note into `MoneyTransaction` and the cached snapshot.
- Add a confirmed `setTransactionNote(transactionId, note)` repository write and expose it through `MoneyDataContext`.
- Show a quiet Note field beneath payment-source truth. Empty state reads `Add a note`; saved state shows the note with multiline wrapping.
- Tapping opens the canonical `BottomDrawer`, `BottomDrawerHeader`, multiline `Input`, and semantic footer.
- Copy states that everyone in the Money household can see the note.
- Saving an empty or whitespace-only value removes the note.
- Never send note content to analytics or use it to change Description, category, meaning, matching rules, coverage, or split.

## UI contract

- Job: When provider text is ambiguous, the user needs to record household context so the transaction is recognizable later.
- Authority chain: explicit user request → brief → Kwilt UI constitution and canonical components → iOS/Android accessibility conventions → RNR form anatomy.
- Three-second read: merchant, amount, payment source, and current category remain primary; the note is secondary.
- Primary action: Save note inside the editing drawer.
- Primary information: current note value and household visibility.
- Secondary information: provider Description remains read-only context.
- Reveal later: keyboard and editing controls appear only after tapping Note.
- Scan order: merchant/amount → source and Description → Note → category and plan treatment.
- Must not add: attachments, tags, note privacy settings, AI inference, a second save confirmation, or note telemetry.
- Reuse map: note trigger → existing Money field shape; editing → canonical `BottomDrawer`, `BottomDrawerHeader`, `Input`, semantic footer.
- Nearest precedent: Money category/coverage drawers; this is a single-field bounded edit rather than a choice or evidence review.
- External exemplar ledger: Pasted Kwilt screenshot, 2026-08-31 — preserve transaction hierarchy; translate the editable-looking Description into a separate user-owned Note; reject copying any outside-product branding or geometry.
- Behavior sources: persistence/sharing from the household Money contract; add/edit/remove from this brief and the user's request.
- Unresolved decisions: none for the local learning release.
- Required states: empty, saved, editing, saving, error, removal, long text, keyboard, and reopened persistence.
- Proof path: Money → transaction detail on the iOS Simulator, add “Family pictures,” close/reopen, edit, and remove.

## Success signal

The family-pictures transaction can be annotated and recognized after reopen, while Description, category, and plan treatment remain unchanged.

## Spec refinement

- Product assumption: notes inherit the existing Money household sharing boundary; the drawer makes this explicit.
- Data assumption: 500 characters is enough for recognition and avoids a general journaling surface.
- Acceptance requires focused normalization/repository/projection tests, diff-aware verification, and real runtime proof. A local migration file alone is not deployed-database proof.

## Open questions

None for the first release.
