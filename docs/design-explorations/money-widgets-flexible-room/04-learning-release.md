# Learning Release: Money Widgets for Flexible Room

## Concept To Build

Two optional small Home Screen widgets carry the exact Managed Month and
category answers outside Kwilt: **Flexible Money** and **Budget Category**.

## Capability Delta

Today, the user cannot:

- see whole-month flexible money in the unified Kwilt widget extension;
- choose dollars left for a category widget in unified Kwilt;
- verify that widget values match the newly implemented Budget answer.

After this release, the user can:

- add a Flexible Money widget that requires no financial configuration;
- add a Budget Category widget, choose a category, and choose dollars or
  percent;
- tap each widget into the correct Budget surface;
- see quiet freshness and an honest no-data/private state.

Still intentionally not supported:

- medium, large, or Lock Screen Money widgets;
- combined whole-plan and category dashboards;
- widget-based plan changes, transaction review, alerts, or app controls;
- in-app widget selection or presentation settings.

## User Experience

### Flexible Money — small Home Screen widget

Normal amount-left state:

- label: `Flexible money`;
- dominant value: exact dollars, such as `$343.20`;
- meaning: `left this month`;
- quiet month/freshness context;
- a calm perimeter uses flexible spending divided by flexible capacity as
  supporting consumption—not as the named answer.

Over state:

- dominant value: exact dollars, such as `$84.00`;
- meaning: `over this month`;
- existing Money over tone, without warning icon, shame copy, or animation.

Tap behavior: open Budget for the current month.

### Budget Category — small Home Screen widget

Native configuration:

- `Category`: one Money category;
- `Show`: `Dollars left` or `Percent used`;
- new default: `Dollars left`.

Dollars-left presentation:

- category name;
- dominant exact amount left, such as `$18.50`;
- `left` or `over` meaning beneath it;
- the existing tick perimeter still represents percent of the category plan
  consumed.

Percent-used presentation:

- category name;
- dominant whole percent used, such as `98%`;
- the same tick perimeter and pace/state tone used by the existing category
  widget design.

Tap behavior: open the selected category detail.

### Shared non-ideal states

- Stale: retain the last supported number and make its age visible; never round
  it into `About`.
- No supported Money answer: `Open Kwilt to finish your monthly plan.` No `$0`.
- Category removed or unavailable: `Choose a category` through native widget
  editing; do not silently substitute another category.
- Money widget data disabled by privacy settings: `Open Kwilt to view Money.`
  Do not retain the prior financial value.
- App Group unavailable: neutral open-Kwilt state.
- Placeholder/gallery preview: representative non-personal sample values, never
  copied real account data.

## Existing Product Relationship

- Reuses `MoneyPlanLimitAnswer` as the only flexible-money calculation.
- Reuses category planned, spent, remaining, percent, pace, and status facts.
- Extends the existing display-safe App Group glanceable-state payload.
- Extends the current WidgetKit target and native AppIntent configuration
  grammar.
- Restores Money widget rendering that existed in the standalone Money product,
  while keeping unified Kwilt's shell and navigation unchanged.
- Leaves Budget, category tiles, plan review, and the general Widgets help
  screen unchanged except for accurate supporting documentation if needed.

## UI Contract

```yaml
Job: When I glance at my Home Screen before or between spending decisions, I
  need to see the exact spending boundary I chose, so I can act without opening
  and interpreting Budget.
Primary action: Tap to open Budget or the selected category.
Must show: One exact dominant answer, its plain meaning, object label, and
  freshness when it is no longer recent.
Reveal later: Full monthly-plan calculation, transactions, category details,
  plan editing, and evidence inside Kwilt.
Must not add: Transaction detail, chart, forecast explanation, warning icon,
  health score, advice, plan-changing control, app-control action, global widget
  preference, or widget-management UI inside Budget.
Reuse map: MoneyPlanLimitAnswer -> Flexible Money value; Money category snapshot
  -> category value and perimeter; App Group glanceable state -> display-safe
  transport; AppIntent entity/configuration -> category and presentation;
  existing Money deep links -> tap destination; existing WidgetKit palette and
  bundled Inter fonts -> visual system.
Behavior sources: Widget scope and per-widget presentation -> explicit user
  decision; dollars-left default -> approved convergence; existing instances
  preserve percent -> continuity decision; exact/stale/private behavior -> Money
  trust and privacy contracts.
Unresolved decisions: None that change first-release behavior.
Required states: amount left, over, stale, missing plan, category removed,
  privacy disabled, App Group unavailable, gallery placeholder.
Proof path: Native iPhone 17 Pro simulator build with the KwiltWidgets extension;
  add each widget from the Home Screen gallery, edit Category configuration,
  switch dollars/percent, compare values with Budget, test deep links, disable
  Money widget data, and relaunch/refresh.
```

## Buildable Slice

Must be real:

- exact whole-plan and category values written by the authenticated app;
- display-safe shared snapshot schema and deterministic projection tests;
- two WidgetKit configurations in the unified Kwilt extension;
- category AppEntity and presentation AppEnum/intent parameter;
- small Home Screen rendering for every required state;
- timeline refresh and explicit reload after Money snapshot updates;
- Budget and category deep links;
- privacy-off cache clearing;
- native simulator add/edit/tap verification.

Can be thin or temporary:

- one supported family (`systemSmall`);
- timeline refresh remains opportunistic within WidgetKit limits;
- freshness uses the shared snapshot timestamp rather than an additional sync
  service;
- gallery descriptions stay short and literal.

Intentionally excluded:

- medium/large families, Lock Screen accessories, interactive AppIntent
  mutations, alerts, Live Activities, analytics beyond existing widget-open
  attribution, and any backend migration.

## Release Channel

`Local build` first. Widget work must be compiled into and installed from the
native Xcode workspace; Metro-only refresh cannot prove the extension. After
Andrew accepts both widgets in the simulator, the next eligible channel is a
`TestFlight build` using the established production-widgets lane.

## Brand-Goodwill Guardrails

- Widget and Budget values must match exactly for the same snapshot.
- Financial values disappear when Money widget data is disabled.
- Missing data never renders as zero.
- Stale data retains the exact last supported value and discloses age.
- Over states remain factual and calm.
- The widget never claims cash availability or purchase affordability.

## Reversibility

The release adds optional WidgetKit configurations and additive fields to the
versioned display-safe snapshot. Removing the widget configurations does not
change Money plans or user financial data. Snapshot decoding must tolerate
older payloads so the app and extension can roll independently during local
iteration.

## Permanent Product Threshold

Promote beyond the learning release when users can add and configure both
widgets without guidance, widget/app numbers remain identical across refresh
and relaunch, privacy and missing-data states are correct, deep links are
reliable, and repeated use shows the widgets reduce the need to open Budget
merely to recover the same answer.
