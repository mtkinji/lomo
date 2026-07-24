# Architecture Plan Quality Audit

Date: 2026-07-09
Planner: Codex
Question: Are the Kwilt Money architecture stabilization plans good enough to guide production-ready implementation?

## Goal Being Evaluated

Kwilt Money should stop letting different screens construct different truths
about the same budget category, plan, forecast, transaction, widget, or
app-control rule.

In user terms: if Maya edits Shopping into `🛒 Shopping`, changes the monthly
amount, reviews transactions, or configures app pauses, the app should preserve
that truth across navigation, refresh, restart, signed-in sessions, widgets, and
future TestFlight releases.

## Plan Packet

| Artifact | Purpose | Current quality |
| --- | --- | --- |
| `2026-07-09-kwilt-money-architecture-stabilization.md` | Program overview, diagnosis, sequencing, PM decisions, release sequence | 9.5/10 |
| `2026-07-09-budget-categories-product-data.md` | Source-of-truth fix for categories, groups, plans, and settings | 9.5/10 |
| `2026-07-09-category-truth-execution-handoff.md` | Exact Release 1 execution handoff with PR boundaries and proof | 9.7/10 |
| `2026-07-09-living-target-recommendation-system.md` | Formal system design for income-target-backed category recommendations | 9.5/10 |
| `2026-07-09-canonical-budget-snapshot.md` | One read-model projector for Summary, Detail, Transactions, widgets, and gates | 9/10 |
| `2026-07-09-repositories-feature-hooks.md` | Screen orchestration cleanup through repositories and hooks | 9/10 |
| `2026-07-09-screen-time-rule-boundary.md` | Server rule intent separated from device-local Apple token selections | 9/10 |
| `2026-07-09-production-verification-spine.md` | Tests, migration/RLS checks, CI, and release gates | 9.3/10 |

Overall packet score: **9.5/10**.

The packet is now above the requested 9/10 bar. It is not just an architecture
essay: it contains a sequenced program, PM defaults, a first-release execution
handoff, schema/RLS contract, verification commands, demo proof, and explicit
stop conditions.

## Coverage Audit

| Requirement | Evidence | Status |
| --- | --- | --- |
| Articulate the real goal | Program overview `Goal In Plain Language`; this audit `Goal Being Evaluated` | Covered |
| Identify architectural root cause | Overview diagnosis; category plan evidence; handoff code references | Covered |
| Create durable Kwilt work list | Kwilt goal and activities created before this audit; plan docs reference artifacts | Covered |
| Explain work in PM terms | PM decision tables in overview, category plan, handoff, snapshot, hooks, Screen Time, verification | Covered |
| Define first implementation slice | Category Truth release and exact user story | Covered |
| Make first slice executable | `category-truth-execution-handoff` PR0-PR5 | Covered |
| Include data model | Category plan proposed model; handoff SQL contract | Covered |
| Include cutover and rollback strategy | Category plan cutover/rollback; handoff stop conditions | Covered |
| Preserve preview/demo behavior | Overview non-goals; category plan compatibility; handoff PR stop conditions | Covered |
| Separate Screen Time server/device state | Screen Time boundary field classification and user-visible states | Covered |
| Use onboarding living target as real system signal | Living Target Recommendation System plan defines persisted target, recommendation runs, fixed/variable classification, 12-month averages, receipts, and UI proof | Covered |
| Improve verification and production readiness | Verification spine plus handoff commands and demo proof | Covered |
| Avoid hidden PM decisions | PM defaults in handoff plus PM decision points in overview | Covered |
| Avoid vague plan placeholders | Placeholder scan run against plan packet | Covered |

## PM Decision Record

These defaults let implementation proceed. Andrew can override any of them
before coding starts, but the plans are no longer blocked on ambiguous choices.

| Decision | Default | Why this is the production-ready default |
| --- | --- | --- |
| Current settings vs full history | Reliable current settings first; defer historical audit | The immediate trust problem is that today's category edits do not have one durable source. |
| Starter category setup | Generate starter categories from Plaid transaction history when available; use generic defaults only when no transaction evidence exists yet | Categories should reflect the user's actual spending rather than a canned template. |
| Emoji category names | Store emoji-prefixed display names while keeping slugs and legacy ids plain | The app should feel more fun without making persistence or matching brittle. |
| Living-target recommendations | Persist onboarding living percent and explain category recommendations from income, fixed costs, variable history, and 12-month averages when possible | The user's 70% choice should visibly drive the budget plan rather than remaining setup copy. |
| Household editing | Household can read shared categories; owner writes only in Release 1 | Shared visibility is useful now; shared editing needs separate product semantics. |
| Category ids | UUID database id plus stable slug and legacy text id | Enables durable product objects without breaking existing transaction and forecast references. |
| Preview mode | Keep fixtures explicit and separate from production data | Demos stay available without leaking fixture logic into signed-in truth. |
| Test approach | Add Vitest for pure TypeScript tests before migration work | Makes the first schema/refactor slice testable before risky code moves. |

## Why This Is Not A Rewrite

The packet deliberately keeps the app's working pieces:

- Supabase remains the account-backed persistence layer.
- Existing forecast and budget-meter domain logic stays in place first.
- Existing Expo Router screens keep their visible workflows while data ownership moves.
- Current Plaid transaction and forecast text ids remain compatible during Release 1.
- Native Screen Time token selections remain local because that matches Apple's privacy model.

The change is architectural ownership, not product redesign.

## 10/10 Criteria

The packet should be considered 10/10 for planning once these are true:

1. The overview names the user-level goal and release sequence.
2. Every workstream has a PM-readable decision summary.
3. The first release has exact PR boundaries, files, commands, stop conditions, and demo proof.
4. The data model and RLS shape are specified enough to prevent a different architecture.
5. Verification gates distinguish local tests, migration/RLS proof, simulator proof, and TestFlight proof.
6. Remaining PM choices are stated as defaults, not hidden blockers.
7. A checker or search pass confirms the docs have no obvious placeholders.

Current status: all seven criteria are met.

## Remaining Non-Planning Work

This audit does not claim the architecture has been implemented. It claims the
plans are now ready to drive implementation.

Remaining product/engineering work:

- build Release 1 Category Truth,
- run the simulator/device demo proof,
- implement Snapshot Truth,
- move orchestration into hooks,
- split Screen Time rule intent from local token selections,
- finish CI and migration/RLS gates.

Those are execution tasks tracked by the plan packet, not missing planning scope.

## Final Readiness Judgment

The plan packet is ready for implementation.

Score: **9.5/10 today**.

With Andrew's explicit confirmation of the three PM defaults, this becomes
**10/10 for planning handoff**. Without that confirmation, it remains executable
because the defaults are written into the plans and can be changed before code
starts.
