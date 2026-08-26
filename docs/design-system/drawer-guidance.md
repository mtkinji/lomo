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
- The grab handle is optically lowered to 12 points below the sheet edge while
  its 17-point layout slot preserves the established header and body position.
- A full-width, 44-point top-edge pan target is independent of that visual slot,
  so touch geometry can grow without pushing drawer content down.
- Standard drawer scroll views carry the 17-point allowance inside their content
  inset, allowing scrolled rows to continue behind the fixed handle and clip only
  at the drawer's rounded top edge.
- The standard handle is 64 by 5 points with the pill radius token.
- `BottomDrawerHeader` uses `typography.titleSm` for the drawer title.
- One layer owns each horizontal gutter; callers must not stack sheet padding
  and body padding to approximate the standard frame.

The compact title is the drawer header, not a limit on expressive content.
Interstitial content may still contain a larger message heading below its
intentional brand-aware frame.

The shared package should eventually own:

- `BottomDrawer` mechanics: snap points, scrim, keyboard avoidance, safe-area handling, drag-to-dismiss, scroll gesture coordination.
- `BottomDrawer` motion: semantic enter, exit, resize, settle, and rebound timing from `theme/motion`; feature callers do not author drawer durations or easing.
- Header primitives: grabber, title block, close/action slots, optional subtitle, optional divider.
- Row primitives: selectable rows, command rows, selected state, trailing check slot, optional leading icon/emoji.
- Search primitive: compact drawer search field with focus state and clear action.
- Picker trigger contract when the drawer is opened from a field.

Apps should keep local:

- Domain-specific rows such as transaction category options, rule suggestions, goal/activity pickers, and forecast explanations.
- Domain-specific copy tone and ordering.
- Whole workflow composition when the drawer is tied to a product object.

## Bottom Affordances

Use the drawer's named semantic regions rather than treating every fixed bottom
control as generic accessory content:

- `footer` completes a bounded task. It owns one trailing horizontal action
  group with an optional neutral or destructive secondary immediately before
  the primary. Actions keep intrinsic widths instead of stretching into equal
  columns. `BottomDrawer` owns its safe area, keyboard relationship, divider
  policy, and scroll clearance. The attached footer always uses the quiet,
  upward-cast `drawerFooter` elevation; it separates the fixed action surface
  from scrolling content without making the footer appear to float. The footer
  surface spans the drawer edge to edge; only its action content is inset.
- `actionDock` keeps the likely next action available while the drawer remains
  an ongoing workspace. It floats over the drawer content instead of creating a
  structural footer band. A single destination uses the 44pt
  `DrawerDestinationAction`, with a centered leading icon and label. Scrollable
  content uses the canonical drawer-dock clearance so its final item remains
  reachable behind the overlay.
- A composer is continuous input and retains its own keyboard and state anatomy.

`bottomAccessory` remains a low-level compatibility seam. New task footers and
drawer docks should not build their own padding or safe-area geometry through it.

## Explicit Exceptions

Exceptions should be selected by anatomy, not recreated with incidental local
padding:

- Conversation drawers, such as Chat, may use edge-to-edge body content while
  retaining the standard rounded frame and in-flow high handle.
- Branded interstitials and Games surfaces may localize color and expressive
  typography while retaining shared mechanics.
- Keyboard docks and inline composers may intentionally hide the handle when
  they are manipulated through their owning input surface.
- Compact floating guides with an explicit `BottomDrawerHeader` close action
  may hide drag chrome through `BottomGuide.showDragHandle={false}`; dismissal
  remains owned by the header instead of a second, redundant affordance.
- Full-screen setup flows may replace the standard header with progress and
  policy controls when that is the actual interaction model.

Ordinary drawers should not override handle-region spacing or promote the
header to `titleMd` or `titleLg`.

## Drawer Types

| Type | Use When | Canonical Anatomy | Source Bias |
| --- | --- | --- | --- |
| Choice picker | User chooses one value from a short/medium list. | Grabber, compact title, optional search, selectable rows, selected check. | Money category picker plus Goals picker behavior. |
| Action sheet | User chooses one command from a small set. | Grabber, title/subtitle, command rows, destructive styling if needed. | Goals drawers. |
| Task drawer | User configures filters, sorting, creation, or edits multiple fields. | Header with close/action, scroll body, optional semantic footer. | Goals `BottomDrawer`. |
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
- Full-height task drawers with a fixed footer use `keyboardBehavior="resize"`
  so the sheet frame remains stable while the form viewport and footer clear the keyboard.

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
