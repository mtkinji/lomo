# Household Food Preflight Gate

Decision date: August 5, 2026
Overall decision: **proceed to Phase 0 foundation and Phase 1 private Recipe**

The contracts are sufficient to begin persistence without collapsing private
Recipe knowledge, family coordination, grocery evidence, retailer state, and
public distribution into one object. “Proceed” does not mean a provider or
user-visible flow is live; it means the next phase has explicit invariants and
failure tests.

## Independent gates

| Area | Decision | Evidence and next condition |
|---|---|---|
| Recipe persistence | `proceed` | Stable Recipe identity, immutable versions, provenance, access, media rights, lifecycle, limits, and compatibility fixtures pass. Phase 1 must implement these constraints in SQL/RLS and repository adapters. |
| Import extraction | `proceed` | Temporary artifacts, evidence, confidence, warnings, expiry, idempotent approval, adversarial fixtures, and hard-failure scoring are specified. Production model calls remain gated on a private dogfood harness and deletion/retention proof. |
| Proposal ledger reuse | `proceed_with_migration` | The canonical decision/receipt lifecycle represents the first spine and compatibility tests pass. Native persistence first requires the reviewed channel-neutral origin and nullable conversation-reference migration described in `proposal-ledger-compatibility.md`. |
| Public-ready identity | `proceed_contract_only` | Public identity, exact-version publication, attribution, media rights, scopes, withdrawal, and child/collaborator negative cases pass. Public UI and publishing remain deferred until moderation, report, takedown, appeal, and audit services have implementation proof. |

## Invariant review

- A Recipe collection is organization, never access authority.
- A Meal Plan pins immutable Recipe versions and a revision creates a new plan
  version; Grocery projections become stale rather than silently changing.
- A Grocery item is not a retailer product, a price, an offer, a Savings Plan,
  a handoff, receipt evidence, or a realized outcome.
- AI proposals carry authorized evidence and expected versions. Deterministic
  code owns quantity, basket, qualification, and realized-savings arithmetic.
- Coupon discovery may report current evidence. Activation, redemption,
  checkout, payment, and orders are never claimed without provider authority.
- Public identity is opt-in and independent of private account and Person
  names. AI cannot attest rights or expand distribution scope.
- No Food operation is marked live merely because it has an ID or schema; its
  provider, review, receipt, and exact-return proof remain separate gates.

## Proof recorded in this preflight

- Recipe, import, publication, Meal Plan, Grocery, Food authority, proposal,
  and evaluation contract suites.
- Canonical capability manifest and operation-language coverage, including
  explicit excluded operations.
- Unified Chat proposal/receipt regression suite.
- App and test typechecks, product lint, architecture lint, and diff-aware
  repository verification.

Native UI, Supabase persistence, production extraction, external retailer
handoff, and signed-device proof are intentionally not claimed by this gate.
