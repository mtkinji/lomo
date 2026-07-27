---
id: job-flow-maya-review-budget-reality-before-spending
audience: audience-aspirational-family-organizers
persona: Maya
hero_jtbd: jtbd-move-the-few-things-that-matter
last_updated: 2026-07-27
---

# Maya: Review Budget Reality Before Spending

## Audience / Persona

Audience: `audience-aspirational-family-organizers`  
Persona: Maya

Maya is helping her household stay organized without turning family life into a
finance hobby. She wants a calm, trustworthy read on household money before a
spending or planning decision, especially when an app makes it easy to spend
without noticing that the month or plan is running hot.

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - Help me make real progress in the few
areas I most want to grow.

## Provenance

This flow promotes and refreshes the standalone Kwilt Money artifact at
`docs/job-flows/maya-review-budget-reality-before-spending.md` from frozen
source `df383c3ac1538dff0a83b43a21ff3e45c024298b`. The demand model is preserved;
the former fixture-era implementation inventory and delivery scores are
replaced with evidence from the native Kwilt capability.

## Active JTBDs

- `jtbd-review-budget-reality-before-spending` - see trustworthy household money
  evidence before spending or changing the plan.
- `jtbd-put-intention-before-impulse` - put a calm, chosen review before an app
  that makes spending easy.
- `jtbd-carry-intentions-into-action` - carry the household plan into the moment
  of action without requiring constant manual oversight.
- `jtbd-trust-this-app-with-my-life` - keep financial truth, restrictions,
  corrections, and plan changes transparent and reversible.

## Job Flow

1. Recognize a Money promise that matches the spending or planning decision and
   enter without learning Kwilt's capability taxonomy.
2. Start or truthfully resume the minimum Money setup required for that decision.
3. Establish the household plan and the categories that matter.
4. Bring connected-account activity into a current, inspectable money view.
5. See the relevant category and whole-plan reality before spending or changing
   the plan.
6. Understand actual spending, planned capacity, outside-plan activity,
   forecast, freshness, and confidence in plain language.
7. Correct transaction meaning or planning assumptions when the evidence is
   wrong or incomplete.
8. Choose whether to continue, adjust the plan, or keep a spend-triggering app
   blocked.
9. See an authoritative result or receipt and trust the pattern enough to use it
   again.

## Current Kwilt Flow

1. Guided Overture can present Money as a concept and preserve selected intent
   in Agent; exact Money links open native Money. The canonical decision-shaped
   offer and `MoneyFirstTrustedDecision` contract are documented but not yet a
   production activation funnel.
2. Money is a native capability inside the shared Kwilt shell and session, with
   Summary, Transactions, Accounts, category detail, transaction detail, and
   first-use setup.
3. Authenticated Money repositories project existing `budget_*` data into one
   snapshot without substituting fixture financial values.
4. Summary and category detail distinguish current spending, plan amounts,
   outside-plan activity, projections, forecast ranges, confidence, and sync
   freshness.
5. Transaction review can correct category and money meaning with a visible
   per-choice pending state and a confirmed local patch before broader refresh.
   Category workflows can create, rename, resize, roll over, preview plan
   impact, apply automatic plans, and show reversible receipts; governed plan
   changes accept one atomic authoritative projection before closing.
6. Category-specific app controls use Apple's opaque Screen Time picker and
   support always-review, pace, threshold, over-plan, and needs-review policies.
7. A shield handoff opens the relevant category review. Maya can open selected
   apps temporarily or keep them blocked, and Kwilt records that local review.
8. Automated tests and an iOS workspace build cover these contracts. Signed
   physical-device Face ID, Plaid OAuth, widget, Screen Time, App Thinning, and
   installed TestFlight behavior remain unverified.

## Offerings

- Native Money Summary, Transactions, Accounts, and object detail.
- Category creation and plan maintenance.
- Transaction categorization and money-meaning correction.
- Whole-plan targets, automatic-plan impact, receipts, and reversal.
- Current-month forecast, range, confidence, and outside-plan truth.
- Connected-account setup, relink, and manual sync surfaces.
- Money privacy lock and app-switcher cover.
- Category-specific Screen Time app controls and review handoff.
- Money widgets and bounded Money evidence in unified Chat.

## Delivery Score

| Step | Score | Rationale |
| --- | --- | --- |
| Recognize and enter the Money job | 2 | Native destinations and a concept Guided Overture offer exist, but the production acquisition-to-activation path and task-specific experiment are not wired. |
| Start or resume minimum setup | 2 | First-use setup and account connection surfaces exist, but shared capability adoption/resume state and exact campaign continuity are not implemented. |
| Establish plan and categories | 4 | Native setup, category creation, plan changes, automatic planning, impact preview, receipts, and reversal exist; authenticated device acceptance remains. |
| Bring in current activity | 3 | Shared-session repositories and Plaid connection/sync surfaces exist, but signed-device OAuth, relink, sync/relaunch, and production-provider proof remain. |
| See reality before acting | 3 | Summary, detail, widgets, and Screen Time handoff provide the intended paths; widget and shield delivery are not yet proven on a signed device. |
| Understand the evidence | 4 | Actual, planned, outside-plan, forecast range, confidence, and freshness are distinct in the native projection; same-account parity still needs device/TestFlight proof. |
| Correct wrong assumptions | 4 | Transaction category/meaning review, exact mixed-category allocation, and plan correction paths rebuild authoritative state. Authenticated simulator save, relaunch, correction, reversal, and database reconciliation pass; installed TestFlight proof remains. |
| Make the intentional choice | 3 | Continue, plan-adjustment, temporary-open, and keep-blocked paths exist; the Screen Time choices still need physical-device proof. |
| Trust and repeat the pattern | 2 | First-use guidance and reversible receipts exist, but `MoneyFirstTrustedDecision`, return behavior, and longitudinal household-use evidence are not yet proven. |

## Evidence Boundary

Current scores are based on source inspection, automated contracts, successful
local verification, a successful generated iOS workspace build, and authenticated
simulator proof for mixed-category transaction persistence and reconciliation.
The 2026-07-27 refinement additionally proves in the authenticated simulator
that checking-account payments use an account-transfer surface, the category
picker separates category assignment from Internal transfer and Outside the
plan, and an unchanged settings save falls in the `under_250ms` telemetry
bucket. It does not claim a repeated p50/p95 sample, physical-device haptics,
installed TestFlight, live Plaid OAuth, widget refresh, Screen Time enforcement,
statement-cycle, or longitudinal household proof.

## Gaps

- Wire exact Money campaign entry, capability-owned setup resume, and a
  privacy-safe `MoneyFirstTrustedDecision` event without treating route arrival
  or Plaid success as activation.
- Promote the Guided Overture Money offer from concept to live only after its
  native route, resume behavior, and decision outcomes pass runtime proof.
- Prove same-account totals, corrections, plan changes, privacy, Plaid, widgets,
  and Screen Time on a signed physical device and installed TestFlight build.
- Complete the Plaid relink/update backend contract.
- Decide and implement the missing household-invite server contract if shared
  Money planning is part of the accepted household model.
- Add a global Kwilt data-export contract that includes Money without exposing
  provider tokens.
- Learn whether forecast and app-control language helps Maya decide quickly in
  repeated real spending moments.
- Keep the standalone build recoverable until parity is accepted and retirement
  is separately authorized.

## Aspirational Design Challenge

How might we help Maya make a calm household spending or planning decision from
current, understandable Money evidence—without turning family finances into a
dashboard habit or making a restriction feel punitive?
