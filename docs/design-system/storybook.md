# Kwilt Design System Storybook

Storybook is the review surface for Kwilt design-system candidates.

Use it to compare tokens, states, variants, and source-app decisions before promoting anything into a shared package.

## Run

```bash
npm run storybook
```

Then open:

```text
http://localhost:6006
```

## Current Stories

- `Foundation/Tokens`: palette, radii, typography, spacing.
- `Primitives/Candidates`: Card, Button, KwiltSwitch, SegmentedControl, Input, Badge.
- `Settings/Patterns`: SettingsGroup, SettingsRow, SettingsToggleRow.

## Why Storybook

The design-system artifact needs to prove real component behavior, not present a custom docs page. Storybook gives us:

- Isolated component states.
- Controls and interactive examples.
- A future path to visual regression and Chromatic-style review.
- A clean separation between component evidence and written product rationale.

## Review Rule

Markdown docs explain the rationale. Storybook proves the component.

When a component becomes canonical, update both:

1. Its Storybook story with the final variants and app-source notes.
2. [`component-inventory.md`](component-inventory.md) with the promotion status.
