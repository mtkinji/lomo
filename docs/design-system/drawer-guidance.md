# Drawer Guidance

Drawers are a shared interaction family, but not every drawer should have identical anatomy.

Drawer guidance should be read with [picker guidance](picker-guidance.md). For selection flows, the closed picker field and the open drawer are one pattern.

Kwilt Goals and Kwilt Money currently use different drawer patterns because they solve different jobs:

- Goals drawers often host task work: filters, sorting, creation, AI, detailed forms, and multi-step edits.
- Money drawers often host fast classification or review: choose a category, adjust an amount, explain a forecast, or confirm a transaction rule.

## Canonical Principle

Share the drawer mechanics. Vary the drawer anatomy by job.

Standard task, choice, action, detail, and progressive drawers share one
canonical top frame:

- The sheet itself has no top padding before the handle region.
- The grab handle sits `spacing.sm` below the sheet edge and
  `spacing.xs` above the header or body.
- The standard handle is 64 by 5 points with the pill radius token.
- `BottomDrawerHeader` uses `typography.titleSm` for the drawer title.
- One layer owns each horizontal gutter; callers must not stack sheet padding
  and body padding to approximate the standard frame.

The compact title is the drawer header, not a limit on expressive content.
Interstitial content may still contain a larger message heading below its
intentional brand-aware frame.

The shared package should eventually own:

- `BottomDrawer` mechanics: snap points, scrim, keyboard avoidance, safe-area handling, drag-to-dismiss, scroll gesture coordination.
- Header primitives: grabber, title block, close/action slots, optional subtitle, optional divider.
- Row primitives: selectable rows, command rows, selected state, trailing check slot, optional leading icon/emoji.
- Search primitive: compact drawer search field with focus state and clear action.
- Picker trigger contract when the drawer is opened from a field.

Apps should keep local:

- Domain-specific rows such as transaction category options, rule suggestions, goal/activity pickers, and forecast explanations.
- Domain-specific copy tone and ordering.
- Whole workflow composition when the drawer is tied to a product object.

## Explicit Exceptions

Exceptions should be selected by anatomy, not recreated with incidental local
padding:

- Conversation drawers, such as Chat, may use edge-to-edge body content while
  retaining the standard rounded frame and in-flow high handle.
- Branded interstitials and Games surfaces may localize color and expressive
  typography while retaining shared mechanics.
- Keyboard docks and inline composers may intentionally hide the handle when
  they are manipulated through their owning input surface.
- Full-screen setup flows may replace the standard header with progress and
  policy controls when that is the actual interaction model.

Ordinary drawers should not override handle-region spacing or promote the
header to `titleMd` or `titleLg`.

## Drawer Types

| Type | Use When | Canonical Anatomy | Source Bias |
| --- | --- | --- | --- |
| Choice picker | User chooses one value from a short/medium list. | Grabber, compact title, optional search, selectable rows, selected check. | Money category picker plus Goals picker behavior. |
| Action sheet | User chooses one command from a small set. | Grabber, title/subtitle, command rows, destructive styling if needed. | Goals drawers. |
| Task drawer | User configures filters, sorting, creation, or edits multiple fields. | Header with close/action, scroll body, optional footer CTA. | Goals `BottomDrawer`. |
| Detail/review drawer | User reviews structured evidence before confirming. | Header, evidence sections, primary CTA, optional secondary action. | Hybrid. |
| Interstitial drawer | User hits a paywall, permission prompt, or guided moment. | Brand-aware header/body, CTA stack, close behavior by policy. | Keep local until repeated. |

## Money Category Picker Notes

The Money category picker should not be copied wholesale into Goals, but it exposes a strong shared variant:

- High snap point around `76%`.
- White sheet with large top radius and visible handle.
- Centered or compact title for simple choice tasks.
- Search directly below the title.
- List rows are dense, calm, and easy to scan.
- Selected row uses a subtle tinted background plus a trailing check.

The trigger that opens it should move toward Goals' `PickerFieldTrigger` pattern rather than staying as a Money-only field shape.

Recommended shared extraction:

```tsx
<DrawerChoicePicker
  title="Choose category"
  searchPlaceholder="Search categories"
  options={...}
  selectedValue={...}
  onSelect={...}
/>
```

`DrawerChoicePicker` should use shared drawer mechanics and shared row/search anatomy. Money can provide category-specific option rendering through slots.

## Goals Drawer Notes

Goals should keep the heavier task-drawer pattern for surfaces like filters, sorting, creation, AI, and object editing:

- Larger snap points, often `90-95%`.
- Header with close/action slots.
- Scrollable body with grouped controls.
- Footer CTA when the drawer has a multi-field commit.

Do not force Money's compact picker anatomy onto these task surfaces.

## Canonical Direction

The product-owner decision is:

1. Keep `BottomDrawer` mechanics canonical and make the high-handle frame its
   standard chrome.
2. Add a shared `DrawerChoicePicker` variant informed by Money.
3. Keep product-specific row rendering local through slots.
4. Use the shared compact `BottomDrawerHeader` for ordinary drawers.
5. Keep Storybook examples tied to the production drawer chrome tokens while
   migrating remaining manual headers and raw modal sheets.
