# Learning Release: Managed Month

## Concept To Build

Kwilt briefly teaches how it formed the monthly plan, then makes the native
Budget screen lead with one exact answer:

> **$343 left for flexible spending this month**
> `$617 of $960 used`

The customer can open **`See monthly plan`** to revisit the same three-part
calculation. Existing categories remain below as supporting guidance.

This release tests whether teaching the model once is enough for a customer to
understand and trust the large number during ordinary use.

## Capability Delta

Today, the customer cannot reliably:

- see one deterministic total for flexible money left;
- connect that total to monthly living money minus protected costs;
- count on ordinary transaction ambiguity being handled without an
  administrative request;
- revisit the calculation through one clearly named disclosure.

After this release, the customer can:

- review a Kwilt-created monthly plan in one short teaching moment;
- return to Budget and immediately see exact flexible money left;
- see flexible spending used versus total flexible capacity;
- inspect the three-part calculation without navigating into Settings;
- continue into category detail when a local spending question matters.

Still intentionally not supported:

- cash safe until payday;
- a new income-normalization engine covering every compensation pattern;
- Chat-based setup or plan changes;
- scheduled outreach, notifications, SMS, widgets, or Screen Time changes;
- automatic value judgments about which category matters less;
- perfect item-level splitting for mixed merchants.

## User Experience

### 1. Teach the model once

At the end of new Money setup—after Kwilt has a supported active plan—show one
plain review moment:

```text
Your monthly plan

You plan to use                    $3,360
Protected costs                   -$2,400
Flexible money                       $960

Kwilt will keep this plan current and tell you what is left.

[Use this plan]
```

The customer does not allocate categories, classify transactions, or approve
individual protected costs here. **`Use this plan`** confirms that the
calculation was presented; it does not create a second plan or recompute the
numbers.

For existing customers receiving this model for the first time, the same review
appears once when Budget has a supported answer. Its completion state may be
device-local for the first learning release. The calculation remains available
later through **`See monthly plan`**.

Do not use a carousel, explanatory card stack, percentage tutorial, quiz, or
forced category review.

### 2. Lead Budget with the answer

For the current month, the existing Budget screen reads:

```text
Budget                                      •••

‹  ›   July 2026                              +

$343 left for flexible spending this month
$617 of $960 used

See monthly plan

[existing category tiles]
```

The answer is plain typography, not a card or banner. It replaces weak states
such as `Kwilt needs one answer` when ordinary outflows can already be counted
conservatively.

The Budget screen does not repeat `70%`, monthly income, protected costs,
forecast, or confidence at rest. Those are supporting evidence, not the daily
job.

### 3. Revisit the monthly plan

**`See monthly plan`** opens an existing sheet or nested disclosure pattern:

```text
Monthly plan

Monthly living money              $3,360
Protected costs                  -$2,400
Flexible money                      $960
Flexible spending so far           $617
Left                               $343

Based on your current planning income and 70% living target.
Updated 15 minutes ago

[Change plan]
```

The disclosure may expand protected-cost composition and planning-income basis
one level deeper. The first view remains the simple arithmetic above.

**`Change plan`** is the one modification affordance. It opens existing
governed Money controls rather than returning to onboarding. From there, the
customer can change the living target, correct a protected amount, or adjust a
category allocation. Every material change uses the existing preview, explicit
Save, receipt, and reversal boundaries.

A later **`Ask about this plan`** affordance may open contextual Chat with the
plan already in scope. It can explain the calculation and construct a typed
change proposal, but Money remains responsible for the dollars, preview, Save,
and receipt. That conversational affordance is deliberately deferred from this
first Money learning release.

`Updated 15 minutes ago` reports financial-data freshness. It is not a warning
and does not invite action while the supported answer remains usable.

### 4. Reuse one plan-change review

Every in-scope **`Change plan`** action enters the same governed review contract.

From **`See monthly plan`**, it opens at the whole-plan level. From Shopping
category detail, it opens with Shopping selected and its current amount visible.
If the customer raises Shopping, the surface renders the whole-plan consequence
before Save:

```text
Shopping gets $100 more this month

Flexible money remains             $960
Beauty has                         $100 less
Protected costs do not change

[Save change]
```

The visible input can differ by context, but the review always uses the same:

- authoritative plan version;
- non-mutating whole-plan preview;
- consequence order;
- period choice for this month versus ongoing;
- explicit Save;
- stale-preview rejection;
- receipt and reversal;
- exact return to the originating Budget or category view.

This release should extract or compose the shared review behavior from existing
governed plan controls. It should not build separate Budget, category, and Chat
calculation paths.

### 5. Preserve category guidance

The existing category tiles remain immediately below the answer. They continue
to show local spending versus the category guide and open category detail.

The first learning release does not redesign the grid or add fixed/flexible
badges. Existing governed category amount changes enter the shared plan-change
review. Their preview must state whether the flexible total or protected costs
change, and the committed Budget answer must agree with the preview.

The first slice can begin from the existing amount editor. Natural-language
requests such as `Give Kids activities $100 more` and automatic source-category
suggestions remain the next slice after the shared consequence review is proven.

### 6. Handle imperfect evidence without burdening the customer

- Every canonical current-period outflow is counted exactly once.
- A high-confidence protected outflow uses its protected allocation.
- An ordinary unresolved or mixed-merchant outflow is counted conservatively as
  flexible spending until corrected.
- Transfers, refunds, duplicates, and other supported non-spending events do
  not consume flexible money.
- Moving a transaction between flexible categories changes category guidance,
  not the already-counted whole-plan total.

Do not ask the customer to review a transaction merely because its precise
flexible category is uncertain.

### 7. Use focused recovery only for genuinely missing foundations

If the living target or planning-income basis truly does not exist, replace the
answer with one compact action card:

> **Finish your monthly plan**
> Add the one missing amount so Kwilt can calculate flexible money.
> **`Finish plan`**

This state must be derived from current authoritative data. Kwilt must not show
it because an onboarding value failed to load, a refresh is in progress, or one
transaction is ambiguous.

When refreshing, keep the last supported answer visible and update it in place.
If the answer is stale but still supported, show its age inside **`See monthly
plan`** rather than creating a warning above the category grid.

## Existing Product Relationship

This release enhances the existing Money system:

- customer-facing `Budget` remains the current Summary destination;
- internal routes and Kwilt shell navigation remain unchanged;
- the answer occupies the existing space above the category grid;
- the three-part review reuses a native sheet or setup-result surface;
- category detail, Transactions, Accounts, plan settings, receipts, privacy,
  and month navigation remain intact;
- Money owns every dollar and classification rule.

It replaces:

- the need to total category balances mentally;
- vague whole-plan uncertainty messages for ordinary purchases;
- repeated explanation of the living percentage on the resting screen;
- `How this works`, whose subject is unclear, with **`See monthly plan`**.

## Buildable Slice

### Must be real

- A pure, tested current-month projection for:
  - persisted planning-income basis;
  - living target and monthly living-money amount;
  - protected-plan amount;
  - flexible capacity;
  - counted flexible spending;
  - exact flexible money left;
  - current evidence freshness.
- The persisted active planning basis must remain stable as individual income
  transactions arrive. This slice uses the existing governed basis; it does not
  infer a new basis from a partial month.
- Deterministic economic-role reconciliation in which every canonical outflow
  is counted once and ordinary unresolved outflows default conservatively to
  flexible spending.
- Regression tests proving that mixed flexible purchases and unresolved
  category placement do not produce a blocking answer state.
- The one-time three-part teaching moment for supported plans.
- The current-month Budget answer and used-versus-capacity line.
- The **`See monthly plan`** disclosure using the same projection.
- A working **`Change plan`** action from that disclosure into the existing
  governed plan controls, with exact return to the updated calculation.
- A reusable plan-change review contract entered from both the monthly plan and
  category detail, with one whole-plan preview, version-checked Save, receipt,
  reversal, and exact return path.
- Focused component tests proving that a category-originated change renders the
  same total-plan consequences as a whole-plan-originated change.
- A true missing-foundation action card with a working recovery route.
- Last-supported-answer behavior during refresh.
- Existing category-change preview and committed result must reconcile with the
  primary Budget answer.
- Accessible reading order, large-text behavior, scrolling, and smallest-device
  rendering.

### Can be thin or temporary

- Store the existing-customer teaching receipt locally for the learning release.
- Limit the new large answer to the current month; preserve truthful existing
  past and future month behavior.
- Use deterministic copy templates rather than generated prose.
- Reuse the current plan basis instead of building compensation-pattern
  detection in this slice.
- Keep existing category tiles and category adjustment UI visually unchanged.

### Intentionally excluded

- A permanent calculation card or dashboard.
- A new Money route, tab, planner, or category taxonomy.
- A feature flag that prevents Andrew from seeing the learning experience in
  the owning Simulator build.
- `Estimated`, `about`, `needs one answer`, or transaction-cleanup headlines for
  ordinary current-period ambiguity.
- A new setup interview or Plaid workflow.
- Priority suggestions, automatic category transfers, or a new rebalance
  composer.
- Chat, loops, notifications, Phone Agent, connectors, and Screen Time work.
- Production-default rollout.

## Release Channel

Use a **Local build** first, visible by default in the owning iOS Simulator.

This supports the fast iteration loop Andrew requested:

1. implement one focused slice;
2. run targeted logic and component tests;
3. hot reload or rebuild only when native changes require it;
4. let Andrew inspect the real connected-data result;
5. revise the product direction if needed;
6. run the comprehensive diff-aware verification gate only after the experience
   is accepted.

After local comprehension and reconciliation pass, package the same unflagged
experience into an Andrew-only TestFlight build. Broader TestFlight evaluation
comes after the income-basis and transaction-accounting evidence is strong
enough to protect trust.

## Brand-Goodwill Guardrails

- Never present plan room as bank balance or permission to buy.
- Never manufacture a precise dollar from a missing planning foundation.
- Never withhold a supported total because category placement is imperfect.
- Never ask the customer to understand internal classifications or confidence
  states.
- Keep correction, evidence, and plan provenance inspectable.
- Use calm dollar language without praise, warning colors, or moral judgment.
- Treat the customer as the authority on priorities even while Kwilt operates
  the routine plan.

## Reversibility

The UI changes reuse existing surfaces and can be removed without deleting
financial data. The teaching receipt is presentation state only. The projection
is pure and reads existing authoritative Money data. No new category taxonomy,
plan format, transaction mutation, notification schedule, or external delivery
contract is introduced.

If the concept fails comprehension testing, restore the existing Budget
hierarchy while preserving the tested projection for future use. If the
projection fails reconciliation, remove the answer rather than fall back to a
vague estimate.

## Permanent Product Threshold

Promote this from a local learning release when:

- the displayed total reconciles against representative connected-data cases;
- a first-time customer can explain the three-part model without coaching;
- a returning customer can identify flexible money left in a few seconds;
- customers do not confuse the number with account balance or cash safe until
  payday;
- mixed flexible merchants and category corrections do not destabilize the
  whole-plan total;
- setup, Budget, disclosure, category preview, Save, relaunch, and receipt agree;
- the real rendered path passes the reductive-UI scorecard and comprehensive
  repository verification.
