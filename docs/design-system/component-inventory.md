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
| Radii | `packages/kwilt-tokens/src/radii.ts` | Canonical | Shared radius contract. |
| Typography | `packages/kwilt-tokens/src/typography.ts` | Canonical | Inter + Urbanist. |
| App family roles | `docs/design-system/brand-family-architecture.md` | Candidate | Needs tokenization: `appGoals`, `appMoney`, `signal`, `meaning`. |

## General Primitives

| Component | Strongest Source | Status | Why |
| --- | --- | --- | --- |
| `Card` | `src/ui/Card.tsx` | Canonical | Use only for a meaningful surface or interaction boundary, not default grouping. |
| `Button` | `src/ui/Button.tsx` | Canonical | Semantic variant and size system. One screen decision gets one dominant primary action. |
| `Input` | `src/ui/Input.tsx` | Canonical | Handles labels, descriptions/errors, variants, icons, multiline behavior, focus, and disabled states. |
| `FormField` | `src/ui/FormField.tsx` | Promote | RNR-aligned label/control/description/message anatomy; requires native and Storybook review. |
| `Dialog` | `src/ui/Dialog.tsx` | Promote | Existing compatibility API plus RNR-aligned anatomy; requires caller and runtime convergence. |
| `AlertDialog` | `src/ui/AlertDialog.tsx` | Promote | Consequential confirmation only; requires runtime evidence before Canonical. |
| `DropdownMenu` | `src/ui/DropdownMenu.tsx` | Promote | RN Primitives behavior with localized RNR anatomy; requires caller and runtime convergence. |
| `PickerFieldTrigger` | `src/ui/PickerFields.tsx` | Canonical | Reusable closed-field grammar. |
| `EnumPickerField` / `SmallSetPickerField` | `src/ui/PickerFields.tsx` | Canonical | Default for small fixed-set choices with compact drawer rows and selected checks. |
| `RelationPickerField` | Kwilt Goals `src/ui/PickerFields.tsx` | Candidate | Strong searchable picker for larger object lists; may need drawer-vs-fullscreen adaptation for Money and desktop. |
| `KwiltSwitch` | `src/ui/KwiltSwitch.tsx` | Canonical | Compact animated toggle; prefer the owning row pattern when label and action form one control. |
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
