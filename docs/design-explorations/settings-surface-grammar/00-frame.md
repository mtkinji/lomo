# Frame: Settings Surface Grammar

## What the user said

> What are your thoughts on this UX generally? I don't think we have clear design rules for when to use a card, when not to, what font size to use, etc. Screenshots 1-2 show native iOS settings. I think there's a lot to learn from these as I'm sure they are very well considered from a UX perspective.

## Restated in user voice

When Maya is adjusting how Kwilt or Kwilt Money behaves, she wants the screen to feel like a calm maintenance surface rather than a new product pitch, so that she can understand and change settings without feeling like she is managing a system.

## Target audience

`audience-aspirational-family-organizers` - households trying to become more organized without adopting a productivity methodology.

## Representative persona

Maya: a parent or household lead who wants calm support for ordinary family decisions.

- Current situation: She is adjusting budget/category behavior such as rollovers, forecast assumptions, and app pauses.
- What she's trying to become/do: Keep family spending intentional without becoming a finance-dashboard operator.
- Emotional state or tension: She wants confidence and control, but too much visual weight makes the page feel like a setup project.
- What would make this feel wrong to her: Hero-like headers, card-heavy layouts, oversized toggles, or explanatory copy that makes routine settings feel consequential.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - settings should help her keep the few important household controls working without creating more work.

## Active anchors

- `jtbd-put-intention-before-impulse` - Screen Time/app-pause settings support intentional access before spend-triggering apps.
- `jtbd-carry-intentions-into-action` - settings should preserve choices so Kwilt can follow through without repeated manual setup.
- `jtbd-trust-this-app-with-my-life` - settings are high-trust surfaces; they must be legible, reversible, and consistent.
- `jtbd-review-budget-reality-before-spending` - category Screen Time controls are a local sub-job under budget reality before spending.

## Job flow step

Flow: `job-flow-maya-review-budget-reality-before-spending`

Most relevant steps:

- Step 2, connect spend-triggering apps or sites to the right category.
- Step 5, choose whether to open the app for now.
- Step 7, keep the household pattern because the pause feels helpful, not punitive.

Current gap: The app is starting to support category-level app pauses, but the settings surface does not yet have a stable design grammar. That makes routine settings feel heavier than the decision they support.

## Friction we're addressing

The current category settings page borrows Kwilt's object-page header and large typography. That is good for primary product moments, but it overstates a routine settings task. Native iOS settings offers a useful reference: subdued page title, gray canvas, white grouped controls, small explanatory text below cards, optional section labels, and consistent rows/toggles.

## System alignment

Constraint posture: `Bend the system`

Current system facts:

- Existing surface: `app/app-control/[budgetId].tsx` is becoming a category settings page with Budget Plan and Screen Time Controls.
- Existing user flow: Budget Detail overflow menu now opens category settings; Screen Time setup remains a separate interstitial when permission is missing.
- Existing domain/data model: category settings touch `SpendCategory` budget fields, rollover flags, forecast settings, and `BudgetScreenTimeSettings` policy overrides.
- Existing technical affordances: Kwilt Money has shared color, spacing, typography, and surface tokens, plus reusable shell components like `KwiltPage`, `PageHeader`, and `BottomDrawer`.
- Existing UX/copy conventions: Budget uses strong object-page headers and white cards on a light shell. Native-settings-like grouped rows are present in spirit but not formalized as a component grammar.

Constraints to preserve:

- Do not turn Screen Time controls back into a generic setup checklist or dashboard.
- Keep app-pause rule editing local to the category.
- Keep settings reversible, direct, and non-shaming.
- Reuse Kwilt tokens and components where they fit.

Constraints we may challenge:

- The default `KwiltPage` header is too large for maintenance settings.
- Not every bordered white shape should be treated as a card; grouped settings rows need their own component category.
- Current typography defaults make routine labels too bold.

Design implication:

Settings need a distinct but Kwilt-compatible grammar: smaller centered navigation title, gray grouped-list canvas, white rounded groups, rows at system-setting density, and helper descriptions under groups rather than inside every row. Cards should be reserved for object summaries, repeated inventory items, modals, or framed tools, not for every individual setting.

## Provisional Settings Grammar

- Use a settings page when the user is maintaining behavior, permissions, defaults, or category configuration.
- Use a product/object page when the user is making the main decision or inspecting the primary object.
- Page title: small, centered, nav-like. The title identifies location; it is not the primary message.
- Canvas: muted shell/gray background for maintenance settings.
- Groups: white rounded settings groups for related rows. Prefer one group per conceptual section.
- Section labels: optional, small, gray, above groups when grouping is not obvious.
- Helper text: small gray text below the group when it explains the whole setting or consequence. Avoid stuffing long explanatory copy into the row.
- Rows: 16-17pt regular label, optional secondary value, trailing control/icon. Use dividers inside multi-row groups.
- Toggles: one Kwilt ecosystem toggle style. Pick one and share it across Kwilt and Kwilt Money.
- Cards: use for primary content objects, repeated inventory items, framed tools, modal content, and visual summaries. Do not use card styling for every settings row.
- Sentence-form controls: allowed inside settings only when they are the clearest control for a compact rule. They should be sentence-scale, not hero-scale.

## Aspirational design challenge

How might we help Maya adjust category and app-pause behavior with the calm familiarity of system settings, while preserving Kwilt's warmer product voice and the category-specific Screen Time rule builder?

## Out of scope

- Redesigning every Kwilt surface.
- Replacing product/object pages with settings lists.
- Copying iOS Settings exactly, including Apple-specific typography, colors, or green switch styling.
- Deciding the final shared component API before divergence.

## Open question

Should Kwilt adopt one shared settings grammar across Kwilt and Kwilt Money now, or should Budget prove it first on category settings and then promote the pattern upstream?
