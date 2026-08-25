# Kwilt Component Inventory

This inventory records component maturity and scope for the unified Kwilt native app. Use it with the [UI constitution](ui-constitution.md), [pattern atlas](pattern-atlas.md), and [Storybook](storybook.md).

Use this with [Storybook](storybook.md) as the component review surface.

## Promotion Status

| Status | Meaning |
| --- | --- |
| Canonical | Current implementation authority for its documented scope. |
| Candidate | Worth reviewing visually before promotion; reuse only in its current scope. |
| Promote | Ready for deliberate hardening and promotion; not canonical yet. |
| Keep local | Domain-specific; useful reference, but not a shared primitive yet. |
| Hybrid | Build the canonical version from both apps. |

Only an explicit product/design-owner decision recorded here grants Canonical status. An agent can prepare the evidence but cannot self-promote an item. Components exported from `src/ui/primitives.ts` but not listed here are Candidate and local to their current use by default.

## Tokens

| Area | Source | Status | Notes |
| --- | --- | --- | --- |
| Raw palette | `packages/kwilt-tokens/src/colors.ts` | Canonical | Pine, indigo, turmeric, madder, quilt blue, clay, moss, sumi. Feature code uses semantic roles rather than selecting raw palette values decoratively. |
| Semantic color roles | `packages/kwilt-tokens/src/colors.ts` | Canonical | `canvas`, `card`, `textPrimary`, `textSecondary`, `accent`, `linked`, `ai*`. |
| Spacing | `packages/kwilt-tokens/src/spacing.ts` | Canonical | Small, stable scale already used across capabilities. |
| Bottom dock geometry | `packages/kwilt-tokens/src/bottomDock.ts` | Canonical | Semantic optical placement for phone-floating docks and fixed full-width drawer actions; approved by Andrew on 2026-08-17. Feature code must not recreate safe-area or inset math. |
| Radii | `packages/kwilt-tokens/src/radii.ts` | Canonical | Shared radius contract. |
| Typography | `packages/kwilt-tokens/src/typography.ts` | Canonical | Inter + Urbanist. |
| App family roles | `docs/design-system/brand-family-architecture.md` | Candidate | Needs tokenization: `appGoals`, `appMoney`, `signal`, `meaning`. |

## General Primitives

| Component | Strongest Source | Status | Why |
| --- | --- | --- | --- |
| `Card` | `src/ui/Card.tsx` | Canonical | Use only for a meaningful surface or interaction boundary, not default grouping. |
| `Button` | `src/ui/Button.tsx` | Canonical | Standard text actions default to a fully rounded Sumi primary and quiet `canvas.selection` feedback; brand-green accent, destructive, and other visual or haptic semantics must be explicit variants. Disabled retains its semantic variant at 50% opacity and exposes disabled semantics. Loading is non-interactive but remains full-strength, exposes busy semantics, and uses the canonical Kwilt loader plus a progress label. Missing prerequisites require nearby guidance; impossible empty states replace or omit the dead action. Feature styles may adjust layout, not color or shape. One screen decision gets one dominant primary action. |
| `HapticPressable` | `src/ui/HapticPressable.tsx` | Canonical | App-owned boundary for custom press controls that cannot use `Button`. Every enabled press gets quiet, rate-limited acknowledgement by default; callers choose a stronger semantic event when appropriate, and synchronous semantic feedback suppresses the generic pulse. Raw React Native `Pressable` and `TouchableOpacity` imports are architecture-linted outside this boundary and the canonical `Button` implementation. Approved by Andrew on 2026-08-25. |
| `Input` | `src/ui/Input.tsx` | Canonical | Handles labels, descriptions/errors, variants, icons, multiline behavior, focus, and disabled states. |
| `FormField` | `src/ui/FormField.tsx` | Promote | RNR-aligned label/control/description/message anatomy; requires native and Storybook review. |
| `Dialog` | `src/ui/Dialog.tsx` | Promote | Existing compatibility API plus RNR-aligned anatomy; requires caller and runtime convergence. |
| `AlertDialog` | `src/ui/AlertDialog.tsx` | Promote | Consequential confirmation only; requires runtime evidence before Canonical. |
| `DropdownMenu` | `src/ui/DropdownMenu.tsx` | Promote | RN Primitives behavior with localized RNR anatomy; requires caller and runtime convergence. |
| `PickerFieldTrigger` | `src/ui/PickerFields.tsx` | Canonical | Reusable closed-field grammar. |
| `EnumPickerField` / `SmallSetPickerField` | `src/ui/PickerFields.tsx` | Canonical | Default for small fixed-set choices with compact drawer rows and selected checks. |
| `RelationPickerField` | Kwilt Goals `src/ui/PickerFields.tsx` | Candidate | Strong searchable picker for larger object lists; may need drawer-vs-fullscreen adaptation for Money and desktop. |
| `KwiltSwitch` | `src/ui/KwiltSwitch.tsx` | Canonical | Compact animated toggle; prefer the owning row pattern when label and action form one control. |
| `KwiltLoader` | `src/ui/KwiltLoader.tsx` | Canonical | Approved by Andrew on 2026-08-17 as the app-wide progress indicator. The quiet Kwilt mark contracts into three rounded, single-color pebbles, accelerates and decelerates symmetrically around a brief fast cruise, preserves its live angle at completion, and becomes static with Reduce Motion. Size and semantic color may adapt to context; the mark and motion do not. The surrounding surface owns any background, copy, and error state. |
| `KwiltRefreshFrame` / `useKwiltRefresh` | `src/ui/KwiltRefresh.tsx` | Canonical | The only native pull-to-refresh implementation. It keeps the platform gesture and hides the native spinner, while a full-width sibling overlay reveals the quiet mark with pull distance, pins the animated mark for the entire refresh, and follows the native collapse on completion. The overlay must never be placed inside scroll content or participate in its padding, gap, or layout. |
| `SegmentedControl` | `src/ui/SegmentedControl.tsx` | Canonical | Animated thumb and compact/default sizes. |
| `Badge` | Kwilt Goals `src/ui/Badge.tsx` | Candidate | Good primitive, but may need softer Money variants. |

## Illustration Styles

| Asset family | Source | Status | Notes |
| --- | --- | --- | --- |
| Goals illustration catalog | Kwilt Goals `assets/illustrations/*.png` | Candidate | Use as the canonical reference for onboarding, celebration, permission, and empty-state art. Keep local until multiple apps need shared illustration roles. |
| Moment hero scale | Kwilt Goals `goal-set.png` in `GoalDetailScreen` | Candidate | Full-screen emotional moments can carry larger art, but copy and the primary action must remain the clearest hierarchy. |
| Utility spot scale | Kwilt Goals `EmptyState` | Candidate | Empty states should use smaller art and remain quiet. Promote only after role, sizing, and asset-loading rules are stable. |

## Settings Surfaces

| Component | Strongest Source | Status | Why |
| --- | --- | --- | --- |
| `SettingsGroup` | `src/ui/SettingsSurface.tsx` | Canonical | Standard grouping anatomy for the current native app. |
| `SettingsRow` | `src/ui/SettingsSurface.tsx` | Canonical | Standard value/navigation/destructive row anatomy. |
| `SettingsToggleRow` | `src/ui/SettingsSurface.tsx` | Canonical | Owns the complete labeled switch interaction. |
| `SettingsPage` | `src/ui/SettingsSurface.tsx` | Canonical | Canonical for the current unified native app; other platforms keep their own shell. |

## Layout And Surfaces

| Component | Strongest Source | Status | Why |
| --- | --- | --- | --- |
| `BottomDrawer` mechanics | `src/ui/BottomDrawer.tsx` | Canonical | Owns snap points, gesture coordination, keyboard avoidance, safe areas, scroll helpers, and modal/inline presentation. |
| `BottomDrawer` standard chrome | `src/ui/drawerTokens.ts` | Canonical | High 64-by-5 handle with an 8-point top inset and 4-point lower inset; standard sheet content starts at the surface edge. |
| `BottomDrawerHeader` | `src/ui/layout/BottomDrawerHeader.tsx` | Canonical | Standard drawer title anatomy uses `titleSm`, optional subtitle, close/action slots, and navbar/minimal variants. |
| Drawer bottom affordances | `BottomDrawer.footer`, `BottomDrawer.actionDock`, `src/ui/layout/BottomDrawerSemanticFooter.tsx`, and `src/ui/DrawerDestinationAction.tsx` | Canonical | A semantic footer completes a bounded task with an intrinsic, trailing action group: the optional quiet secondary precedes the stronger primary without equal-width columns. Its attached surface and always-on, subtle upward `drawerFooter` elevation span the drawer edge to edge, while the action group retains its canonical inline inset. A drawer action dock floats over an ongoing workspace and keeps its likely next destination available; its standard full-width button uses centered leading context and a 44pt target. `BottomDrawer` owns the overlay, safe-area, inset, and clearance geometry. `bottomAccessory` remains a compatibility seam rather than the preferred feature API. Approved by Andrew on 2026-08-25. |
| Page and resting dock frames | `src/ui/ActionDock.tsx`, `src/ui/FullWidthActionDock.tsx`, and `src/ui/layout/restingComposerMetrics.ts` | Canonical | Resting inventory and detail controls share the To-dos inventory's 32pt corner nesting without sharing width behavior: detail actions remain intrinsic with deliberate open space, while inventory capture/search may flex before fixed circular utilities. `FullWidthActionDock` retains the narrower page-action geometry for one persistent full-width button. Approved by Andrew on 2026-08-17, extended to full-width page buttons on 2026-08-20, and refined for resting floating controls on 2026-08-25. |
| `CapabilityOnboardingStepScreen` | `src/features/capability-onboarding/CapabilityOnboardingStepScreen.tsx` | Canonical | Default full-screen capability setup step. Owns the Parchment canvas, fixed logo/counter/close chrome, 112pt two-line title region, fixed 232pt illustration anchor, vertically centered decision region, and `FullWidthActionDock` clearance. Capability code supplies semantic copy, one illustration, step content, and at most one action. Approved by Andrew on 2026-08-20. |
| `DrawerChoicePicker` anatomy | Hybrid, leaning Kwilt Money | Candidate | Money's category picker is a strong pattern for fast classification drawers: compact title, search, dense selectable rows, selected check. Build as a shared variant with app-provided rows. |
| Drawer task/edit surfaces | Kwilt Goals | Candidate | Goals has stronger task drawers for filters, sort, creation, AI, and multi-field edits. These should not collapse into the compact Money picker pattern. |
| `Toast` | Kwilt Goals | Candidate | Good cross-app feedback candidate. |
| `EmptyState` | Kwilt Goals | Candidate | Needs Money tone variants. |
| `ObjectPageHeader` | Hybrid | Candidate | Shared anatomy, but object semantics differ. |
| `ScreenSection` | Kwilt Money | Candidate | Useful compact section pattern for Money; may be too finance/admin-specific. |

## Goals-Specific Patterns

| Component | Source | Status | Notes |
| --- | --- | --- | --- |
| `ActivityListItem` | Kwilt Goals | Keep local | Domain-specific activity behavior. |
| `GoalCard` / `GoalListCard` | Kwilt Goals | Keep local | Good reference for shared Card, but goal-specific. |
| `OpportunityCard` | Kwilt Goals | Candidate | Could inform shared highlight card later. |
| `SurveyCard` / `QuestionCard` | Kwilt Goals | Keep local | Onboarding and reflective flows. |

## Money-Specific Patterns

| Component | Source | Status | Notes |
| --- | --- | --- | --- |
| `MeterCard` | Kwilt Money | Keep local | Money-domain meter and forecast copy. |
| `CategoryMeterTile` | Kwilt Money | Keep local | Strong finance-specific visual. |
| `RunwayChart` | Kwilt Money | Keep local | Domain-specific data visualization. |
| `TransactionMatchRow` | Kwilt Money | Keep local | Transaction review semantics. |
| `Paywall` | Both apps | Candidate | Entitlement should be shared, but product identity differs. |

## Distribution Recommendation

The current source-owned canonical layer lives in `src/ui`. If multiple applications need native distribution, extract the following to `@kwilt/ui-native` without treating package movement as a prerequisite for canonicality:

1. `KwiltSwitch`
2. `SettingsGroup`
3. `SettingsRow`
4. `SettingsToggleRow`
5. `Card`
6. `Button`

Validate adoption in at least two real surfaces before expanding the package. Canonicality comes from the constitution, inventory, rendered evidence, and usage contract—not from the package name.
