# Diverge: transaction-rule-truth

## Axis of variation

Status-first vs action-first, and inline truth vs drawer-contained truth.

## Alternative 1: Rule Receipt

The transaction page shows a compact inline receipt beneath Category. If a matching rule exists for the selected category, it says `Rule active` and plainly states `Future Costco charges → Shopping`. If no matching rule exists, it says `No rule yet` and offers `Create rule`. The drawer opens only after that explicit action.

- Persona fit: high; Maya sees truth before a decision.
- Design-challenge answer: separates current category from future automation.
- System fit: high; uses the existing page, loaded rules, and rule builder.
- Best when: rule status should remain visible after the drawer closes.
- Fails when: the inline receipt grows into a miniature settings panel.
- Anti-pattern check: passes if limited to one status and one action.

## Alternative 2: Truthful Rule Drawer

Keep the entry affordance nearly unchanged, but make the drawer's first block diagnose the state: `No active Costco rule`, `59 transactions are already Shopping`, and `Creating this rule will affect future matches; 0 existing transactions will change`. If a rule exists, replace the create CTA with `Rule already active` and a close action.

- Persona fit: medium-high; the full explanation is available at the moment of action.
- Design-challenge answer: makes delta explicit, but only after Maya opens the drawer.
- System fit: high; mostly copy and derived counts.
- Best when: the page must remain extremely spare.
- Fails when: the misleading offer itself is the source of doubt.
- Anti-pattern check: risks making the drawer explanatory and dense.

## Alternative 3: Provenance Per Row

Every preview row labels its source: `Rule`, `Confirmed`, `Suggested`, or `Provider category`. The header summarizes the mix and the CTA adapts to uncovered rows.

- Persona fit: medium; excellent auditability but more detail than Maya usually needs.
- Design-challenge answer: explains why all visible rows look the same.
- System fit: medium; the match source exists, but provider-vs-inference language needs careful mapping.
- Best when: debugging conflicts or mixed provenance matters.
- Fails when: the list becomes a classification dashboard.
- Anti-pattern check: high risk of finance-system clutter.

## Alternative 4: Automatic Rule Deduplication Only

Before opening the drawer, silently check for an equivalent active rule. If one exists, do not offer rule creation. If none exists, keep the current builder unchanged.

- Persona fit: medium; removes one bad path but does not explain the visible history.
- Design-challenge answer: prevents duplicate rules without building understanding.
- System fit: very high; narrow conditional behavior.
- Best when: duplicate creation is the only observed problem.
- Fails when: Maya still cannot tell whether repeated category results will continue.
- Anti-pattern check: low clutter, but too implicit for a trust surface.
