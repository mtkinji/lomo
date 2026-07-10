# Kwilt Component Inventory

This is the first picking list for promoting components into a shared Kwilt design system. It is intentionally biased toward Kwilt Goals for mature general-purpose patterns, with Kwilt Money called out where it has the stronger interaction.

Use this with [Storybook](storybook.md) as the component review surface.

## Promotion Status

| Status | Meaning |
| --- | --- |
| Candidate | Worth reviewing visually before promotion. |
| Promote | Likely should become canonical in `@kwilt/ui-native`. |
| Keep local | Domain-specific; useful reference, but not a shared primitive yet. |
| Hybrid | Build the canonical version from both apps. |

## Tokens

| Area | Source | Status | Notes |
| --- | --- | --- | --- |
| Raw palette | `packages/kwilt-tokens/src/colors.ts` | Promote | Pine, indigo, turmeric, madder, quilt blue, clay, moss, sumi. |
| Semantic color roles | `packages/kwilt-tokens/src/colors.ts` | Promote | `canvas`, `card`, `textPrimary`, `textSecondary`, `accent`, `linked`, `ai*`. |
| Spacing | `packages/kwilt-tokens/src/spacing.ts` | Promote | Small, stable scale already used across Goals and Money. |
| Radii | `packages/kwilt-tokens/src/radii.ts` | Promote | New shared radius contract. |
| Typography | `packages/kwilt-tokens/src/typography.ts` | Promote | Inter + Urbanist, with app-local finance additions in Money. |
| App family roles | `docs/design-system/brand-family-architecture.md` | Candidate | Needs tokenization: `appGoals`, `appMoney`, `signal`, `meaning`. |

## General Primitives

| Component | Strongest Source | Status | Why |
| --- | --- | --- | --- |
| `Card` | Kwilt Goals `src/ui/Card.tsx` | Promote | Mature padding, elevation, tokenized margins, already built around shared surfaces. |
| `Button` | Kwilt Goals `src/ui/Button.tsx` | Promote | More complete variant and size system than Money. |
| `Input` | Kwilt Goals `src/ui/Input.tsx` | Promote | Handles variants, icons, multiline behavior, focus/error states. |
| `PickerFieldTrigger` | Kwilt Goals `src/ui/PickerFields.tsx` | Promote | Goals has the stronger reusable closed-field grammar. Money category fields should converge on this trigger before category pickers become shared. |
| `EnumPickerField` / `SmallSetPickerField` | Kwilt Goals `src/ui/PickerFields.tsx` | Promote | Good default for small fixed-set choices with compact drawer rows and selected checks. |
| `RelationPickerField` | Kwilt Goals `src/ui/PickerFields.tsx` | Candidate | Strong searchable picker for larger object lists; may need drawer-vs-fullscreen adaptation for Money and desktop. |
| `KwiltSwitch` | Kwilt Money `src/ui/kwilt-switch.tsx` | Promote | Clear compact animated toggle; already mirrored in Goals but Money drove the setting pattern. |
| `SegmentedControl` | Kwilt Goals `src/ui/SegmentedControl.tsx` | Promote | Animated thumb and compact/default sizes. |
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
| `SettingsGroup` | Hybrid | Hybrid | Both apps are nearly aligned; Goals has divider support, Money has app-shell fit. |
| `SettingsRow` | Hybrid | Hybrid | Shared row anatomy is stable; navigation/back behavior should stay app-local. |
| `SettingsToggleRow` | Kwilt Money | Promote | Money settings/app-control flows are the clearest toggle use case. |
| `SettingsPage` | Keep local | Keep local | Navigation/app shell differs by app. Share rows/groups, not the whole page yet. |

## Layout And Surfaces

| Component | Strongest Source | Status | Why |
| --- | --- | --- | --- |
| `BottomDrawer` mechanics | Kwilt Goals | Promote | Goals has the stronger implementation for snap points, gesture coordination, keyboard avoidance, safe areas, scroll helpers, and modal/inline presentation. |
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

## First Extraction Recommendation

Create `@kwilt/ui-native` with:

1. `KwiltSwitch`
2. `SettingsGroup`
3. `SettingsRow`
4. `SettingsToggleRow`
5. `Card`
6. `Button`

Adopt those in one Kwilt Goals settings surface and one Kwilt Money settings/app-control surface before promoting more.
