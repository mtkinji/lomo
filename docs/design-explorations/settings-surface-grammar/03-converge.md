# Converge: Settings Surface Grammar

## Qualitative Scoring

| Alternative | Persona fit | System fit | Blast radius | Main risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Native-Literate Settings | High | Medium | Medium | Feels too generic for Kwilt | Good reference, not the final voice |
| Kwilt-Warm Grouped Settings | High | High | Low-medium | Warmth can creep back into heaviness | Chosen |
| Product-First Rule Console | Medium | High locally | Low | Makes settings feel like a dashboard | Reject |
| Progressive Settings Disclosure | Medium-high | Medium | Medium | Hides the app-pause rule | Use sparingly |
| Shared Settings Kit First | High long-term | High | Medium-high | Abstraction before proof | Borrow only the smallest primitives |

## Chosen Alternative

Use **Kwilt-Warm Grouped Settings** for maintenance/configuration pages, proved first on Budget category settings.

The design should borrow native iOS Settings hierarchy:

- quiet page title
- muted settings canvas
- white rounded groups
- compact rows
- helper text below groups
- consistent toggles

But it should preserve Kwilt where it matters:

- warmer token colors
- sentence-form controls for compact rule editing
- plain, user-owned language
- no Apple-clone visual skin

## Capability Delta

Today, the user cannot:

- Tell whether a category settings page is a maintenance surface or a primary Budget object page.
- Predict when a setting will be a card, row, drawer, or inline editor.
- Scan category settings without the Screen Time controls visually dominating the page.

After this concept ships, the user can:

- Open `Shopping settings` and see a quiet grouped settings page.
- Recognize rollover, forecast, and Screen Time as settings groups.
- Adjust app-pause rules inline without the page feeling like a hero screen.

Still intentionally not supported:

- Migrating every Kwilt and Kwilt Money settings surface.
- Replacing primary Budget Detail pages with settings-list design.
- Hiding the app-pause sentence behind a generic row.

## Reductive Design Decisions

- Replace object-page header treatment on settings pages with a smaller settings title.
- Replace one-card-per-setting styling with grouped settings rows.
- Move explanatory copy below groups where possible.
- Keep Screen Time trigger editing inline, but reduce the sentence and row scale.
- Do not introduce a new visual dashboard for settings.
- Do not make every setting row icon-led.
- Do not use cards as the default settings container.

## Activation Path

The user encounters this when they choose `Category settings` from Budget Detail, or when Screen Time setup returns them to a category-owned settings page.

No explicit education is needed. The page should teach itself by feeling familiar: grouped rows, helper text, toggles, chevrons, and a compact sentence field.

## Accepted Trade-Offs

- The page becomes less visually branded than current Budget object pages.
- Some Kwilt typography hierarchy must bend for settings density.
- We may need local Budget components before promoting a shared cross-app package.

## Rejected Trade-Offs

- Do not make settings feel like Apple Settings with no Kwilt personality.
- Do not hide the Screen Time rule completely behind a secondary page.
- Do not redesign all settings screens before proving this one.

## System Implications

Budget should introduce small local primitives:

- `SettingsSurface`
- `SettingsGroup`
- `SettingsRow`
- `SettingsHelperText`
- `SettingsToggle`
- `SettingsSentenceField` or equivalent compact rule styling

If the simulator proof works, these can inform a shared Kwilt settings kit.

## Bet

We're betting that a native-literate but Kwilt-warm settings grammar will make high-trust configuration feel calmer and more predictable. If it still feels heavy, we'd revisit by removing inline Screen Time trigger editing from the first screen and summarizing it behind an editor row.

## Success Signal

In simulator review, `Shopping settings` should read first as a quiet settings page, not a Screen Time product screen. The user should be able to identify rollover, forecast, and app-pause controls within a few seconds without feeling the page is asking them to learn a new concept.
