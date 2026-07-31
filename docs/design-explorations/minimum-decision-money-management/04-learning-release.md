# Learning Release: The Living-Limit Answer

## Concept To Build

Kwilt's native Budget should give the customer one current-month answer about
what remains inside their chosen living limit, then preserve that same truth
when they change a category amount.

The first release proves the financial comprehension loop:

```text
See my limit and room in Budget
              ↓
Change one category amount
              ↓
Understand the whole-plan consequence before Save
              ↓
Return to Budget and see the committed answer
```

It does not attempt to prove Chat, scheduled checks, Phone Agent, Screen Time,
or the external connector. Those remain later ways to ask for, protect, or
receive the same Money-owned answer.

## Reductive UI Contract

The financial model may be comprehensive. The resting interface must not look
comprehensive.

```yaml
Job: When I open Budget or change one category amount, tell me whether I still
  have room inside the living limit I chose, so I can feel oriented and decide
  without reconstructing the plan.
Primary action: Save the category change already being edited; Budget itself
  requires no action.
Must show: One answer; the chosen percentage and dollar limit; one material
  consequence or qualification.
Reveal later: Planning-income source, protected composition, flexible math,
  affected-category detail, freshness, confidence, and receipts.
Must not add: A card stack, status dashboard, legend, new meter, fixed/flexible
  badges on every category, explanatory banner, permanent CTA, tutorial, health
  score, or duplicate settings control.
Reuse map: Existing Money screen typography, month header, category grid,
  settings drawer, Save flow, preview boundary, and receipt path.
Behavior sources: Active living-plan projection for truth;
  previewLivingPlanOverride for hypothetical state; existing versioned commit
  and receipt for applied state.
Unresolved decisions: Exact shortest language for flexible room and the minimum
  classification evidence required to use it without qualification.
Required states: Supported, no room, over limit, unassigned, stale,
  insufficient meaning, no income basis, preview loading, preview stale, save
  failure, and committed success.
Proof path: Money > Budget > current month > category > Settings > edit amount >
  preview > Save > return to Budget, on the owning iOS runtime with large text.
```

### Visible-element budget

At rest, the new Budget hierarchy earns at most:

1. one large answer line;
2. one short line containing the limit or the only important qualification;
3. one low-emphasis disclosure action.

No wrapper card, icon, illustration, border, badge, progress meter, or color key
is required. Existing spacing and type hierarchy should make the answer legible.
The category grid begins immediately afterward.

During rebalance, the existing editor earns at most:

1. one consequence headline;
2. one short explanation of what moves or remains protected;
3. one disclosure for exact affected categories when more detail is necessary;
4. the existing Save action.

Copy is not allowed to compensate for an unclear hierarchy. If the answer needs
a paragraph to make sense, the structure or the financial claim must be reduced.

## Capability Delta

Today, the customer cannot:

- see the chosen living percentage, its dollar limit, and its income basis on
  the ordinary Summary surface;
- tell at a glance how much genuinely flexible spending remains rather than
  interpreting the sum of category balances;
- see, before saving a category change, whether the whole plan remains inside
  the chosen limit and exactly what other category capacity would move;
- verify that the answer after Save is the committed result they just approved.

After this release, the customer can:

- open `Money > Budget` and see one current-month answer first;
- see `70%`, the corresponding dollar limit, and the planning-income basis
  without navigating to settings;
- distinguish the amount protected for supported commitments and reserves from
  the amount remaining for flexible spending;
- edit one category amount and receive a non-mutating whole-plan preview before
  Save;
- understand whether the proposed change stays within the living limit, moves
  capacity from other flexible categories, or exceeds the limit;
- save once and return to a Budget answer that agrees with the preview and the
  resulting receipt.

Still intentionally not supported:

- claiming that plan room is cash in the bank or that all bills are cash-flow
  covered;
- general `Can I buy this?` amount entry or purchase interruption;
- contextual Chat, scheduled checks, system-originated outreach, widgets, SMS,
  or ChatGPT connector behavior;
- Screen Time setup or enforcement changes;
- automatic changes to the customer's living percentage;
- silently reducing protected amounts to make another category fit;
- household-scoped budgeting;
- a permanent fixed-versus-flexible category taxonomy in the visible UI;
- historical protected/flexible answers until historical plan semantics are
  proven.

## User Experience

### 1. Budget becomes the ordinary orientation surface

Rename the customer-facing `Summary` destination and screen title to `Budget`.
Keep the internal `MoneySummary` route and the existing shell, month paging,
category grid, Transactions, Accounts, and navigation behavior.

For the current month, place one answer above the existing category grid:

> **$343 left for flexible spending**
>
> Within your 70% living limit of $3,360.
>
> `How this works`

The headline is the answer. The percentage and dollar limit are the one visible
orientation line. The income basis, protected amount, and calculation details
remain one tap away rather than becoming a second dashboard.

`How this works` opens a disclosure using an existing drawer or
nested detail pattern. It shows the planning-income source and freshness,
living-limit calculation, protected-plan inputs, flexible capacity, counted
spending, and any uncertainty. It never calls the result an account balance.

The existing category grid remains the next layer of evidence. The current
total row is demoted or collapsed if it merely repeats the answer.

For past and future months in this release, preserve the current period view and
use existing truthful language. Do not project the current living plan backward
or manufacture historical flexible-room answers.

### 2. Non-ideal states answer honestly

The answer block must support at least these current-month states:

- **Supported:** `$343 left for flexible spending this month.`
- **No flexible room:** `Your protected plan uses the full 70% living limit.`
- **Over the limit:** `Your plan is $84 over your 70% living limit.`
- **Unassigned capacity:** `$120 of your living limit is not assigned yet.`
- **Stale evidence:** retain the last trustworthy answer, state its date, and
  offer the exact refresh or account recovery action.
- **Insufficient meaning:** show the living percentage and supported dollar
  facts, name the one consequential uncertainty, and do not display `$0 left`.
- **No planning-income basis:** say that Kwilt cannot calculate the dollar limit
  yet and link to the existing recovery path.

Only show `left for flexible spending` when the projection can support the
protected-versus-flexible boundary. Otherwise give the narrower true answer.

### 3. Rebalancing uses the same answer

When the customer changes a category's monthly amount, run the existing
non-mutating living-plan preview before Save. Replace the current generic impact
copy with a plain whole-plan consequence.

Within the limit, with capacity moving elsewhere:

> **This stays within your 70% living limit.**
>
> $60 moves from Dining and Shopping. Protected expenses do not change.
>
> `See changes`

Within the limit, using unassigned capacity:

> **This stays within your 70% living limit.**
>
> This uses $60 that was not assigned. No other category changes.

Over the limit:

> **This puts your plan $84 over its 70% living limit.**
>
> Protected amounts stay in place.
>
> `See ways to make it fit`

The exact affected categories are available before Save, but do not need to be
expanded by default when the short consequence is sufficient. `See changes`
reveals names and amounts without leaving the decision. Spending already
recorded does not change.

Save remains one explicit action. A successful save closes the editor, updates
the authoritative Budget answer, and creates the existing plan receipt. A
failed or stale preview never mutates the active plan and gives one recovery
action.

### 4. Setup is aligned, not redesigned

This release does not replace Plaid or create a new onboarding structure. It
updates only the handoff and result necessary to make the same Money model
understandable:

- explain that the chosen percentage is the portion of planning income reserved
  for ordinary living;
- when account evidence becomes available, show the chosen percentage in
  dollars before completion;
- end with the same living-limit and flexible-room answer the customer will see
  in Budget;
- remove any redundant abstract `build` decision if the system is merely doing
  the calculation the customer already requested.

If including this setup copy materially expands the first implementation, it
may follow immediately after the Budget/rebalance slice. The release is not
considered permanently coherent until setup's final answer matches Budget.

## Existing Product Relationship

This enhances existing Money surfaces rather than creating a new destination:

- `Summary` is renamed `Budget` only in customer-facing copy;
- `MoneySummary` remains the internal route;
- the answer sits above the existing category grid;
- category settings retain their current editor and Save flow;
- `previewLivingPlanOverride` remains the non-mutating scenario boundary;
- the active living-plan version and receipt remain authoritative after Save;
- Plaid, Transactions, Accounts, category details, forecasts, and app-shell
  navigation remain in place.

The release deliberately replaces two interpretation burdens:

1. adding category balances to infer what is available;
2. reading `other categories change` and guessing whether the 70% intention is
   still intact.

## Buildable Slice

### Must be real

- A pure, tested current-month projection that returns:
  - planning-income basis and provenance;
  - living percentage and dollar limit;
  - supported protected amount;
  - flexible capacity, counted flexible spending, and flexible room;
  - planned total, unassigned amount, and over-limit amount;
  - freshness, confidence, and the reason a stronger answer is unavailable.
- Explicit economic interpretation of existing allocation components. Fixed,
  reserve, customer override, and flexible evidence cannot be collapsed by UI
  copy when their meaning differs.
- A clear rule for how spending in a mixed or provisionally classified category
  contributes to the flexible-room answer. If the current data cannot support
  that rule, the projection must return a qualified state rather than guess.
- Unit coverage for supported, no-room, over-limit, unassigned, stale,
  insufficient-evidence, mixed-category, and no-income-basis states.
- A current-month Budget answer consuming that projection.
- A rebalance preview consuming the same limit facts and exposing every material
  allocation change before Save.
- A single semantic answer renderer that can appear as plain typography on
  Budget and as plain consequence text in the existing editor. It must not
  impose a reusable card treatment or bring its own decorative chrome.
- Preview/commit consistency: the saved result must match the preview version or
  reject the save as stale.
- Accessible reading order and scalable text that preserve the headline,
  percentage, dollar basis, qualification, and primary action.

### Can be thin or temporary

- Use the existing drawer and typography primitives rather than designing a new
  evidence surface.
- Preserve the current category tiles without fixed/flexible badges or new
  grouping.
- Limit the new primary answer to the current month while historical semantics
  remain unchanged.
- Use deterministic copy templates for the bounded answer states.
- Test with the existing category settings flow before considering a dedicated
  rebalance composer.
- Gate the experience to a TestFlight cohort if historical or mixed-category
  qualification needs observation before broader release.

### Intentionally excluded

- A new Money tab, dashboard, planner, question center, or protection center.
- A visible technical label such as `FlexibleRoomProjection`.
- A user-maintained fixed/flexible classification exercise during setup.
- A universal health score, traffic-light judgment, or congratulatory budget
  language.
- New answer cards, banners, charts, legends, ornamental icons, or color-coded
  financial states when words and type hierarchy communicate the result.
- Forecast-based overspend promises in the primary headline.
- Automatic category movement without a preview and explicit Save.
- Chat launchers, loop offers, notification scheduling, Phone Agent, or external
  connector work.
- New Screen Time controls.
- Broad visual redesign of the category grid.

## Release Channel

Use a **TestFlight build**, after local typecheck, tests, and Simulator visual
proof from the owning checkout.

The concept depends on comprehension, text scaling, real account evidence,
month changes, and real category edits. A static prototype cannot establish
whether the answer remains trustworthy through a live rebalance. TestFlight
keeps the audience controlled while allowing Andrew and a small set of willing
customers—including someone with low app fluency—to use the complete bundled
flow on their own devices.

The release should be invited as a normal Money improvement, not branded as an
AI experiment. Participants should know that the answer is an early version and
be given a direct way to report anything they cannot reconcile.

## Brand-Goodwill Guardrails

- Show one answer first and no more than one primary action.
- Treat every added line, border, icon, color, and component as a cost that must
  improve immediate comprehension or enable the current decision.
- Keep comprehensive evidence available through progressive disclosure instead
  of displaying every requirement simultaneously.
- Always show the percentage with its dollar limit and planning-income basis
  somewhere in the immediate answer or one-tap disclosure.
- Never call plan room `cash available`, `safe to spend`, or `affordable` unless
  the required cash-flow evidence exists.
- Never display `$0` as a fallback for missing or stale evidence.
- Do not label flexible spending frivolous or discretionary; variable essentials
  remain legitimate.
- Preserve customer-protected amounts unless the customer explicitly changes
  them.
- Show every material rebalance consequence before Save.
- Keep the proposed plan isolated until Save succeeds.
- Make source freshness and consequential uncertainty visible without alarmist
  language.
- Ensure transaction/category totals remain traceable to the records shown.
- Do not introduce Chat or outreach as a shortcut around an untrustworthy Money
  calculation.

## Reversibility

Keep the release additive and presentation-scoped around the existing
versioned living-plan contracts:

- preserve `MoneySummary` route names and stored navigation state;
- do not migrate category identities merely to rename the screen;
- add a versioned projection rather than rewriting historical plan rows;
- keep previews non-mutating and commits on the existing version/receipt path;
- isolate new answer rendering behind one Money-owned component or feature gate;
- retain the current Summary total as an available fallback during the learning
  period;
- avoid notification permissions, background jobs, connector scopes, or new
  persistent customer settings in this release.

If the answer proves confusing or the classification is not trustworthy, Kwilt
can hide the new answer block and restore the prior customer-facing label while
retaining the tested domain projection for refinement.

## Permanent Product Threshold

This becomes accepted Money behavior only when real use shows that customers
can answer all of the following without assistance:

1. What is my living limit in percent and dollars?
2. What income amount is that based on?
3. How much is protected and how much flexible spending remains?
4. Is that number plan room or cash in my account?
5. If I change this category, do I remain inside my limit?
6. What else changes, and what stays protected?

The projection must reconcile with its disclosed sources, the post-save Budget
answer must agree with the accepted preview, and no observed mixed-category or
stale-data case may produce a stronger claim than the evidence supports.

If customers understand the living limit but not `flexible spending`, revise
the language before adding more surfaces. If the domain cannot reliably support
the protected/flexible boundary, narrow the primary answer to the living-plan
limit and resolve the data model before advancing Chat, outreach, or purchase
guidance.
