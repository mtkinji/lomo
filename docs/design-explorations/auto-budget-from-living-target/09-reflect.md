# Phase 7: Reflect After Implementation

## What the live evidence changed

1. **Complete evidence requires explicit pagination.** Supabase's 1,000-row response ceiling initially hid recent categorized history. Reconciliation now exhausts stable, ordered pages before hashing or allocating.
2. **Payroll labels are not dependable identity.** A real recurring source was recognizable from provider income classification but not its description. Provider evidence is now accepted only with recurrence, completed-period, amount, asset, and one-time gates.
3. **Broad provider income can be genuinely variable.** Stable-source logic alone rejected useful history. Six or more completed income periods now fall back to a conservative lower-range irregular receipt.
4. **Tiny recurring credits are not a living resource.** Provider-backed income must clear a meaningful monthly floor, preventing cents of interest from becoming the planning basis.
5. **Source receipts need active evidence versions.** Old clustering policies left stale receipts in storage. Profiles now carry `active` and `evidence_hash`, and audits use only the current evidence snapshot.
6. **Lineage is not an effective plan difference.** Reversal changes provenance hashes; it should not trigger another promotion when all effective values are identical.
7. **The active plan must be the read authority.** A notice beside legacy amounts is not implementation. An atomic active-pointer trigger now projects all six component amounts into the existing account-backed budget plans used throughout the product.

## Evidence obtained

- 2,807 transaction rows read through complete pagination.
- Real conservative variable-income candidate promoted; immediate rerun returned `no_op`.
- Six plan components matched six account-backed category plans exactly.
- Temporary override survived recomputation.
- Real reversal RPC restored the prior component values and remained active through another reconciliation.
- Active eligible receipts exactly matched the resource basis.
- A live asset-proceeds source was observed and contributed zero.
- Target math, component totals, receipt uniqueness, RLS, authenticated-only RPC access, and the kill switch passed.
- iPhone 17 rendered one material Summary notice without plan-management chrome.

## Durable product conclusion

The transparent versioned shadow planner is viable as infrastructure, not a destination. The trust boundary is earned by conservative resource eligibility, complete evidence, hard preservation of fixed/user-set values, atomic projection into existing budgets, and visible reversible receipts. The normal user should continue to experience budgets—not a planner.

## Follow-up after broader internal use

- Measure how often provider-backed aggregate income falls into stable versus irregular mode.
- Review whether the $500 monthly resource floor needs policy calibration across benefit and low-income households.
- Expand deterministic category assignment beyond the currently supported account-backed category mapping only when real cleanup evidence warrants it.
- Keep promotion internal until two account changes and two period transitions complete without manual repair.
