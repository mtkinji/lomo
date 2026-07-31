# Evaluate Learning: The Living-Limit Answer

## Decision This Evaluation Must Support

Decide whether Kwilt can make the customer's living limit and remaining
flexible room understandable at the moment of orientation and rebalance using
only:

- one answer line;
- one limit or qualification line;
- one progressive disclosure;
- the existing Save action when a decision is already in progress.

The evaluation is not trying to prove that more financial information increases
engagement. It is trying to prove that the least visible interface can still
produce correct understanding, confidence, and control.

## The Bet Under Test

We are betting that customers—including people with low app fluency—do not need
more budgeting UI. They need one trustworthy Money-owned answer, with the
chosen limit visible and the complete calculation available only when wanted.

If that minimal hierarchy cannot communicate the answer without coaching, the
first response is to improve the wording, ordering, or financial claim. It is
not to add cards, meters, banners, legends, or permanent helper text.

## Learning Questions

### Comprehension

1. After a brief unassisted read, what does the customer believe `$343 left for
   flexible spending` means?
2. Do they understand that `70%` is their chosen ordinary-living boundary, that
   `$3,360` is its dollar value, and that it is based on planning income?
3. Can they distinguish plan room from current account balance or guaranteed
   cash-flow coverage?
4. Do they understand, without learning Kwilt's internal taxonomy, that some
   planned amounts remain protected while other room can move?
5. When evidence is stale or insufficient, do they understand what Kwilt knows,
   what it cannot claim, and the single recovery action?

### Rebalance decision

6. Before Save, can the customer say whether the proposed category change:
   - stays within the living limit;
   - uses unassigned room;
   - moves room from other flexible categories; or
   - puts the plan over the limit?
7. Can they name what will change and what will remain protected?
8. Do they understand that the preview has not changed the active plan yet?
9. After Save, does the updated Budget answer match the consequence they
   believed they accepted?

### Reduction

10. Is each of the three possible resting elements necessary?
11. Can any line or disclosure label be removed without reducing correct
    understanding?
12. Does anyone need permanent explanatory copy that belongs in `How this
    works`, or do they merely need a clearer headline?
13. Does the answer remain legible with large text, a small supported screen,
    realistic category names, and non-ideal financial states without creating
    new visual containers?

### Trust and usefulness

14. Does the answer feel useful enough to replace adding category balances by
    hand?
15. Can the customer find the calculation and source when they want to verify
    it?
16. Can they find and correct the underlying plan input instead of feeling that
    Kwilt has issued an unexplained judgment?
17. Does the minimal presentation feel calm and sufficient, or sparse and
    withholding?

### Technical truth

18. Can the protected/flexible projection classify current plan components and
    counted spending without inventing meaning for mixed or provisional cases?
19. Does every preview either match the subsequent committed version or reject
    the Save as stale?
20. Do current-month, preview, receipt, and post-save Budget surfaces use the
    same versioned facts?

## Highest-Risk Assumptions

1. Even `$343 left for flexible spending` may be heard as bank balance or
   guaranteed purchasing power rather than room inside this plan.
2. `Living limit` may be understandable only to people who remember setup.
3. Existing fixed, override, reserve, and flexible components may not fully
   support the protected/flexible claim for mixed categories.
4. Hiding the income basis and protected composition behind one disclosure may
   preserve calmness or may hide the very evidence required for trust.
5. A short rebalance consequence may conceal category movements customers
   consider material.
6. People with low app fluency may understand the words but miss the disclosure
   or misread preview as confirmation.

## Evidence Plan

Use three evidence gates. A later gate cannot compensate for failure in an
earlier one.

### Gate 1: deterministic truth

Before visual learning counts, exercise fixture-based states for:

- supported flexible room;
- no flexible room;
- over-limit plan;
- unassigned capacity;
- stale evidence with a prior trustworthy answer;
- insufficient category meaning;
- no planning-income basis;
- mixed fixed/flexible spend;
- preview that reallocates multiple categories;
- preview that uses unassigned room;
- preview that exceeds the limit;
- concurrent plan change between preview and Save.

For each fixture, independently reconcile:

- planning income × living percentage = dollar limit;
- protected, flexible, unassigned, and over-limit amounts;
- counted spending and remaining room;
- disclosed categories and transaction totals;
- preview facts, committed facts, and receipt facts.

Any arithmetic mismatch, unsupported classification, or preview/commit drift is
a stop condition. UI comprehension testing cannot legitimize an untrustworthy
answer.

### Gate 2: moderated comprehension on a real device

Use a small directional cohort of at least six people:

- at least three people who describe themselves as low-confidence or
  low-fluency with apps;
- at least two people at or beyond typical retirement age;
- at least three people who currently make household spending decisions;
- avoid assuming that age predicts conversational or financial ability.

Categories may overlap. This is not a statistically representative study; it
is an early comprehension and failure-discovery gate.

Let each participant use a signed or TestFlight iPhone build without a feature
tour. Use realistic but non-sensitive seeded data unless they explicitly choose
their own connected data.

Ask them to complete this path without coaching:

1. Open Money and tell us what the first answer means.
2. Tell us the living limit in percent and dollars.
3. Explain whether the remaining amount is cash in an account.
4. Find what the limit is based on and what is protected.
5. Change one category amount using each material preview state.
6. Before Save, explain what will change and what will not.
7. Save one change, return to Budget, and explain the new answer.
8. Encounter one stale or insufficient-evidence state and attempt recovery.

Use neutral prompts after the first read:

- `What do you think this amount means?`
- `Seventy percent of what?`
- `If you saved this, what would change?`
- `Has anything changed yet?`
- `Where would you look if this seemed wrong?`

Do not teach the terms `protected core`, `flexible room`, or `planning-income
basis` before asking. The customer does not need Kwilt's vocabulary; they need
the correct mental model.

### Gate 3: ordinary TestFlight use

After the moderated gate passes, invite the same cohort plus Andrew to use the
experience through at least one real category edit and two ordinary Budget
visits over seven to fourteen days.

Gather:

- a short in-context note after the first Budget read;
- whether and why `How this works` was opened;
- whether a category change was saved, cancelled, or revised after preview;
- whether the customer later contradicted their original interpretation;
- any manual reconciliation they performed outside Kwilt;
- any moment they wanted more visible information or found visible information
  unnecessary;
- whether the answer remained credible after transactions changed.

Repeated opens are not success by themselves. The useful behavior is returning
to the answer for orientation or using the preview to make a real plan decision
without reconstructing the arithmetic.

## Reductive Copy Check

Start with the shortest candidate that already names the financial scope:

> **$343 left for flexible spending**
>
> Within your 70% living limit of $3,360.

If any participant interprets `$343` as cash in the bank, guaranteed purchasing
power, or money left after every obligation, replace the headline—not the screen
around it—with the next-shortest accurate phrase and retest it with participants
who have not seen the earlier version. Do not add permanent helper copy merely
to preserve a headline that failed.

For every visible element, record the failure introduced by removing it:

| Element | It earns its place only if removing it causes |
| --- | --- |
| Answer line | The customer cannot orient to remaining plan room. |
| Limit line | The customer cannot connect the answer to their chosen boundary. |
| `How this works` | The customer cannot verify basis, protection, or uncertainty. |
| Rebalance consequence | The customer cannot predict the result before Save. |
| `See changes` | A material multi-category movement cannot be inspected. |

If removal causes no observed or safety-relevant failure, remove the element.
Do not retain it because it looks balanced or complete.

## Supporting Evidence

Evidence supporting the bet includes:

- participants describe the remaining amount as room inside their monthly plan,
  not an account balance;
- they can identify the percentage and dollar limit without opening settings;
- they can reach the income basis and protected composition when asked;
- they correctly predict each rebalance outcome before Save;
- they understand preview versus committed state;
- the post-save answer matches their expectation;
- low-app-fluency participants complete the same path without moderator rescue;
- participants use disclosure selectively rather than needing all evidence
  permanently visible;
- no participant asks what a decorative state, icon, meter, or badge means,
  because none was added;
- every tested value reconciles to versioned source facts.

## Disconfirming Signals

Revise or stop if:

- anyone reasonably interprets the answer as current cash and the safer
  headline does not correct it;
- more than one of six participants cannot identify the living percentage and
  dollar limit after an unassisted read;
- any low-app-fluency participant cannot explain whether a preview is within or
  over the limit after one ordinary attempt;
- participants save while believing the preview already changed the plan;
- `How this works` feels hidden, opens an overwhelming disclosure, or still
  fails to establish the income basis;
- the interface requires permanent helper copy, multiple cards, or a legend to
  explain the concept;
- mixed categories produce confident flexible-room claims that cannot be
  reconciled;
- preview and committed results differ without a stale-version rejection;
- users continue summing categories manually because the leading answer is not
  trusted;
- the answer causes anxiety or moral judgment around necessary variable
  spending;
- text scaling hides the amount, limit, qualification, or Save consequence.

## Decision Rule

Proceed to accepted product capability only if all truth and safety gates pass
and, in the moderated cohort:

- at least five of six participants correctly explain the primary answer after
  an unassisted read;
- all low-app-fluency participants can find the limit and complete a rebalance
  without moderator intervention;
- at least five of six correctly predict the rebalance consequence before Save;
- all participants distinguish preview from committed state;
- all participants distinguish plan room from account balance after the final
  chosen wording;
- every tested preview reconciles with the committed plan or rejects stale
  state;
- no additional persistent UI is required to achieve those results.

If comprehension fails but the financial model is sound, revise in this order:

1. headline wording;
2. reading order and type hierarchy;
3. the one supporting line;
4. disclosure label and organization;
5. narrow the claim.

Only consider another persistent component after those reductions fail and the
observed misunderstanding is both material and unsolved by progressive
disclosure.

If the financial model cannot support protected/flexible truth, do not soften
the UI threshold. Ship only the narrower living-limit answer or stop and extend
the domain model first.

## Learning Instrumentation

Use a minimal event set:

- `money_budget_answer_viewed`
  - answer state, period relation, freshness bucket, projection version;
- `money_budget_explanation_opened`
  - answer state and originating surface;
- `money_rebalance_preview_viewed`
  - outcome class, changed-category count bucket, used-unassigned boolean;
- `money_rebalance_changes_opened`
  - changed-category count bucket;
- `money_rebalance_saved` or `money_rebalance_cancelled`
  - preview outcome and whether the amount changed again after preview;
- `money_rebalance_stale_rejected`
  - no financial payload;
- `money_budget_recovery_invoked`
  - stale, missing income, or insufficient meaning.

Do not collect:

- raw transaction names, category names, dollar amounts, account balances, or
  income through analytics;
- conversation recordings or screen recordings without explicit research
  consent;
- tap heatmaps, attention scores, or inferred financial confidence;
- generic time-on-screen as a proxy for comprehension;
- extra events merely because a component can emit them.

Keep a short research note for each participant containing observed words,
misinterpretations, moderator interventions, disclosure use, rebalance outcome,
and requested additions or removals. Store no real financial values unless the
participant explicitly consents and they are necessary to investigate a defect.

## Brand-Goodwill Check

At the end of each session, ask:

- `Did Kwilt make this feel clearer or more complicated?`
- `Did anything sound more certain than it should?`
- `Was anything on this screen unnecessary?`
- `What, if anything, would you be afraid to change here?`

Goodwill is protected when customers describe the answer as calm, factual,
reversible, and easy to verify. A polished screen that produces false certainty
does not pass.

## Expected Next Action

If this evaluation plan feels right, create the native Money feature brief. The
brief must carry forward:

- the pure projection and mixed-category truth boundary;
- the three-element resting-screen limit;
- the two-line rebalance consequence and progressive disclosure;
- preview/commit version consistency;
- the non-ideal states;
- the TestFlight comprehension thresholds;
- the explicit exclusion of Chat, outreach, purchase checking, Screen Time
  changes, widgets, SMS, and connectors from the first implementation.

Implementation remains unauthorized until that brief is reviewed and the
remaining domain and copy assumptions are surfaced in spec refinement.
