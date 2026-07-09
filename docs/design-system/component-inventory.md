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
| `KwiltSwitch` | Kwilt Money `src/ui/kwilt-switch.tsx` | Promote | Clear compact animated toggle; already mirrored in Goals but Money drove the setting pattern. |
| `SegmentedControl` | Kwilt Goals `src/ui/SegmentedControl.tsx` | Promote | Animated thumb and compact/default sizes. |
| `Badge` | Kwilt Goals `src/ui/Badge.tsx` | Candidate | Good primitive, but may need softer Money variants. |

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
| `BottomDrawer` / sheets | Kwilt Goals | Candidate | Mature but app behavior needs careful extraction. |
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
