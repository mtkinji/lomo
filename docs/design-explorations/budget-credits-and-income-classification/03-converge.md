# Converge: budget-credits-and-income-classification

## Qualitative Score

| Alternative | Persona / JTBD fit | System fit | Data risk | UX weight | Verdict |
| --- | --- | --- | --- | --- | --- |
| Type First, Then Impact | Strong | Medium | Medium | Low-medium | Good foundation, but too abstract if shown without consequences. |
| Category Group First | Medium | Low | High | High | Too much Monarch-style finance taxonomy for the first Kwilt slice. |
| Meaning Choice With Meter Preview | Very strong | Medium | Medium | Medium | Best fit. Lets the user choose meaning by seeing what changes. |
| Refund And Reimbursement Inbox | Medium | Low-medium | Medium | Medium-high | Valuable later, too workflow-heavy for the first release. |
| Income Source Confirmation | Strong | Medium-high | Medium | Low | Needed, but incomplete without category-credit handling. |
| Minimal Net Position Fix | Medium | High | Low-medium | Low | Necessary repair, but insufficient as the product answer. |

## Chosen Alternative

Choose `Meaning Choice With Meter Preview`, backed by a smaller `Type First` domain model.

The product surface should be the transaction detail sheet, not a new Income tab or category-management console. For ambiguous inflows, Kwilt should show a short meaning section:

- `Income` - counts toward income/runway and does not reduce a spending category.
- `Category credit` - reduces a selected category and can make the category net-positive for the month.
- `Transfer / not counted` - keeps the transaction out of income and category meters.

Each choice should preview the effect before save. For the rent example:

- `Income`: Adds $2,200 to income this month. Housing stays at $2,052 spent.
- `Housing credit`: Lowers Housing to $148 ahead this month.
- `Not counted`: Leaves income and Housing unchanged.

Kwilt can suggest `Income` for stable repeating outside-source deposits like rent, but the user remains the authority on meaning.

## Capability Delta

Today, the user cannot:

- Flag a positive transaction as income instead of a category credit.
- See how choosing income versus category credit changes the Housing meter.
- Make refunds reduce a category's top metric when the refund exceeds current spend.
- Keep refunds, reimbursements, transfers, and rewards out of income/runway without hiding them.
- Remember the meaning of a recurring source after one review.

After this concept ships, the user can:

- Open a positive transaction and choose what the money means.
- Preview whether the choice affects income/runway, category net position, or neither.
- Save the choice and optionally apply it to similar future transactions.
- See category headers represent net category position instead of clamped gross spend.
- Treat dependable recurring rent as income by default while still allowing a Housing-credit interpretation.

Still intentionally not possible:

- Full rental-property accounting, tax categorization, or business P&L.
- Split one inflow across multiple meanings in the first release.
- Automatic life-event claims from income changes.
- A full Monarch-style category group administration system.
- Expected-refund tracking before a refund arrives.

## Reductive Design Pass

Smallest elegant version:

- Add one `Money meaning` section to transaction detail for positive transactions.
- Add three first-release outcomes: `Income`, `Category credit`, `Not counted / transfer`.
- Show one sentence of impact preview per option.
- Remember meaning for similar transactions only after the user opts in.
- Update category net-position math and header copy so negative spend can be represented.

Enhance existing feature:

- Use the current transaction detail sheet and similar-transaction rule pattern.
- Use existing income-pattern and forecast evidence as downstream consumers.
- Use the current category detail header instead of adding a new report.

Refuse to add:

- A separate Income setup screen for the first release.
- User-facing debit/credit/accounting terms.
- Split credit support.
- Expected-refund inbox.
- Broad dashboards, charts, or trend cards.
- Automatic tax/business labels.

What would feel like clutter:

- Showing all meaning options on every transaction, including ordinary outflows.
- A nested category tree inside transaction detail.
- Persistent explainer cards after the user has reviewed the source once.
- Asking users to classify small cashback or interest deposits before the meter can work.

## Activation Path

The right activation moment is an ambiguous positive transaction that is currently visible in a category or income-sensitive surface.

Activation examples:

- A green inflow appears in Housing activity while the Housing headline still says spend.
- A recurring rent-like deposit appears more than once and is not already confirmed as income.
- A refund-like inflow matches an active category source.
- A payment-app deposit is large enough to affect a category or income summary.

Teach contextually, not globally. The transaction detail sheet should say what changes. The app should not teach a finance taxonomy up front.

Natural adoption signal:

- The user reviews a positive transaction, chooses meaning, and enables "remember similar."
- Future similar transactions land with the expected meaning and the meter feels right without another review.

## Accepted Trade-Offs

- We accept adding a new transaction-meaning model because `BudgetMatchSource` cannot safely carry both assignment confidence and income/credit/transfer meaning.
- We accept that first-release rules are merchant/source based and imperfect, as long as the user can inspect and reverse them.
- We accept that income and category credit are separate meanings even when users sometimes think of them together.
- We accept a lightweight explanation in the metric area when a category is net-negative, because surprising good news still needs proof.

## Rejected Trade-Offs

- Do not silently treat every inflow assigned to a category as category relief.
- Do not silently treat every recurring inflow as income.
- Do not make users preconfigure income categories before the app can show a truthful meter.
- Do not merge all Budget categories into a finance-app category tree just to solve this case.
- Do not hide credits from category detail to preserve a simpler `$X spent / $Y` header.

## System Implications

- Add transaction meaning separate from budget match:
  - `income`
  - `category_credit`
  - `transfer`
  - `not_counted`
  - possibly `unknown` / `needs_review`
- Add meaning source:
  - inferred
  - confirmed
  - rule
  - corrected
- Category spend math needs signed net position, not clamped zero-only `spentCents`.
- Category header copy needs states for:
  - positive spend: `$2,052 spent / $2,400`
  - zero spend: `$0 spent / $2,400`
  - net credit/ahead: `$148 ahead` or `$148 net credit`
- Income/runway should include confirmed income and high-confidence income patterns, but exclude category credits, refunds, transfers, rewards, and not-counted transactions.
- Forecast evidence should continue distinguishing pending and unreviewed credits.

## Stated Bet

We're betting that users will trust positive transactions more when Kwilt shows the consequence of each meaning choice before saving it. If it turns out users want a full income/category management console instead, we'd revisit by adding a category-group management surface after the transaction-detail learning release proves the basic model.

## Success Signal

The first success signal is Andrew self-using the rent/Housing example and agreeing that the chosen meaning makes the Housing header, income summary, and transaction row all feel true at the same time.
