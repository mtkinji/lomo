# Diverge: Settings Surface Grammar

## Axis Of Variation

How closely should Kwilt settings follow native iOS settings conventions versus expressing Kwilt's own warmer product language?

## Alternative 1: Native-Literate Settings

Use a settings surface that is deliberately close to iOS Settings: muted gray canvas, compact centered title, grouped white rounded rectangles, optional gray section labels, row dividers, regular 16-17pt labels, trailing controls, and explanatory text below groups. Kwilt color enters lightly through selected controls, not through heavy cards or hero copy.

- Audience/persona fit: Strong for Maya when she is maintaining behavior. It feels familiar, calm, and low-risk.
- Design-challenge answer: Helps her adjust category/app-pause behavior with the least cognitive friction.
- System-fit note: Requires a new `SettingsPage`/`SettingsGroup` grammar that bends the current large `KwiltPage` header pattern.
- Best when: The screen is mostly preferences, permissions, defaults, or reversible category controls.
- Fails when: The surface needs to teach a new product concept or make a meaningful primary decision.
- Anti-pattern check: Pass. It avoids productivity-app chrome and avoids dashboarding settings.

## Alternative 2: Kwilt-Warm Grouped Settings

Keep the iOS grouping logic but make it more recognizably Kwilt: slightly warmer shell background, softer group radius, Kwilt section language, small icons only where they aid scanning, and a single Kwilt toggle style. The page title becomes smaller and calmer, but not necessarily fully centered/native. Sentence-form controls remain because they carry Kwilt's product personality when a setting is really a rule.

- Audience/persona fit: Strong for Maya if we want settings to feel approachable without becoming generic system UI.
- Design-challenge answer: Preserves the comfort of native settings while keeping Kwilt's voice around meaningful controls.
- System-fit note: Extends existing tokens and surfaces instead of copying Apple outright. Likely easiest to promote across Kwilt and Budget.
- Best when: Settings include a mix of ordinary switches and Kwilt-specific rule controls.
- Fails when: The page tries to style every row with icons, badges, cards, and explanatory prose.
- Anti-pattern check: Pass if the warmth is restrained; failure if it reintroduces oversized cards and headers.

## Alternative 3: Product-First Rule Console

Treat category settings as a small rule console: clear page title, then dedicated product modules for Budget Plan, Forecast, and Screen Time Controls. Each module has its own visual treatment and mini-editor. Cards are acceptable because the settings are framed as meaningful category behavior, not generic toggles.

- Audience/persona fit: Medium. It can feel powerful, but risks making Maya feel like she has to administer a system.
- Design-challenge answer: Makes complex settings explicit and discoverable.
- System-fit note: Fits current Budget object-page styling better, but it does not solve the ecosystem-wide ambiguity about cards, rows, and settings density.
- Best when: Settings are complex, interdependent, and need a guided setup explanation.
- Fails when: The user only wants to flip a behavior or understand the current state quickly.
- Anti-pattern check: Risk. It can drift into productivity-app/dashboard behavior and make controls feel more consequential than they are.

## Alternative 4: Progressive Settings Disclosure

Use native-like grouped rows for the first read, but push complex editing into drawers or secondary pages. Category settings shows rows like `Rollover`, `Forecast source`, `App pauses`, and `Pause when`; tapping a row opens an editor. The main screen becomes a quiet index of settings, while rule editing happens contextually.

- Audience/persona fit: Medium-high. The first page stays calm, but nested editing may feel like extra navigation.
- Design-challenge answer: Keeps settings scan-friendly and avoids large inline controls.
- System-fit note: Reuses existing drawers and route patterns, but may conflict with the prior Screen Time direction to keep the rule visible and editable in place.
- Best when: Many settings need summaries but few need constant editing.
- Fails when: The core value is seeing a complete rule at once, such as `Pause [apps] when [category]...`.
- Anti-pattern check: Mixed. It reduces clutter, but can hide the app-pause rule behind too many taps.

## Alternative 5: Shared Settings Kit First

Before redesigning any one screen, create a shared `SettingsPage`, `SettingsGroup`, `SettingsRow`, `SettingsToggle`, `SettingsHelperText`, and `SettingsSentenceField` component set. Then migrate Budget category settings onto it as the first consumer. Main Kwilt screens are audited later against the same primitives.

- Audience/persona fit: Indirect but strong long-term. Maya benefits from consistent behavior across surfaces.
- Design-challenge answer: Solves the root inconsistency, not just the immediate page.
- System-fit note: Best engineering foundation, but risks spending too much time on abstraction before proving the feel.
- Best when: Multiple settings screens are about to be touched.
- Fails when: The immediate product problem needs quick simulator iteration.
- Anti-pattern check: Pass only if the component kit is small and driven by one real screen.

## Cross-Alternative Observations

- Native iOS settings is most useful as hierarchy guidance, not as a visual skin.
- The current category settings page should not use the large object-page title treatment.
- Cards should stop being the default container for settings rows.
- Sentence-form editing is still valuable for app-pause rules, but only as a compact row-level control.
- Helper copy should mostly move below groups.
- The toggle decision should be ecosystem-wide, not page-local.

## Recommendation To Carry Into Convergence

The strongest direction is **Alternative 2: Kwilt-Warm Grouped Settings**, with a practical slice from **Alternative 5: Shared Settings Kit First**.

That gives us a clear product feel while still creating reusable primitives. It avoids both extremes: not a generic iOS clone, not another oversized Kwilt object page.
