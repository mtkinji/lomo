# Component quality audit

Date: 2026-07-17

This is the interaction-quality baseline for Kwilt Money's current React Native client. It inventories reusable interaction seams, calls out one-off implementations, and distinguishes changes proved in code from changes proved in the simulator.

## UI contract: category actions

- Job: When Maya is inspecting a category, she needs to reach the category's secondary actions without losing context, so she can make a small adjustment and return to the money evidence.
- Primary action: Open the overflow menu.
- Must show: `Category settings` and `Edit header image`, with familiar icons and at least 44pt targets.
- Reveal later: The destination screens and their controls.
- Must not add: A new navigation layer, explanatory copy, a share action without a defined share contract, or a second menu implementation.
- Reuse map: Overflow trigger -> `HeaderActionPill`; popover -> `DropdownMenu`; rows -> `DropdownMenuItem` plus `menuStyles`.
- Behavior sources: Existing category-detail destinations and the shared menus already used by Summary, Transactions, and Accounts.
- Unresolved decisions: None for this bounded consistency fix.
- Required states: Closed, opening, open, item pressed, outside dismissal, repeated open/close, reduced motion, and disabled item when introduced.
- Proof path: iPhone simulator -> Summary -> category detail -> header overflow -> each action.

## Measured baseline

The pre-change source inventory contained:

| Signal | Count | Meaning |
|---|---:|---|
| Direct `Pressable` elements | 112 across 31 files | Most control styling and feedback is still owned by screens. |
| Shared `Button` uses | 11 | A useful primitive exists, but it is not the default control path. |
| Shared dropdown roots | 3 | Summary, Transactions, and Accounts were shared; category detail was a one-off modal. |
| Shared `BottomDrawer` uses | 12 | High-leverage common transient surface. |
| `Modal` elements | 5 | One was the category popover; the remainder are true full-screen experiences. |
| Text inputs | 8 | Inputs are few but are styled inside feature surfaces rather than through one field primitive. |
| Switch controls | 2 | One shared `KwiltSwitch`, one intentional dark onboarding treatment using the platform switch. |
| Direct `Animated.timing` calls | 18 | Motion values remain distributed across several components. |
| Alert calls | 37 | These use the platform alert contract; they are not custom modal debt. |

After the broader shared-control sweep requested on 2026-07-17:

| Signal | Count | Meaning |
|---|---:|---|
| Direct `Pressable` elements | 73 across `app` and `src` | Down from 112; remaining uses are mostly rows, cards, selection tiles, clear controls, and other semantically specific surfaces. |
| Shared `Button` uses | 35 | Primary/secondary CTA behavior is now the default across onboarding, paywall, privacy unlock, transaction review, living-plan receipts, and budget unlock guidance. |
| Shared `IconButton` uses | 14 | Header, close, month-navigation, and compact icon actions now share haptics, accessibility state, hit slop, and pressed scale. |

## Inventory and disposition

| Family | Current implementation | Assessment | This pass | Next standardization seam |
|---|---|---|---|---|
| Overflow and filter menus | `DropdownMenu`, `menuStyles`; category detail previously used a screen-local `Modal` | Highest-priority inconsistency and the source of the reported lag | Category detail migrated; shared trigger haptic, pressed state, continuous corners, reduced-motion-aware 110ms/80ms transition, and named VoiceOver actions | Add visual regression coverage for long labels and smallest supported width |
| Bottom drawers | One `BottomDrawer` used by 12 call sites | Structurally shared, but timing values were duplicated and linear | Opening/settling now use one spring; close and scrim use shared motion configs | Simulator-check short fixed-height and keyboard-avoiding drawers |
| Header actions | `HeaderActionPill`, `ObjectPageHeader`, and `PageHeader` | Strong object-page primitive; standard page header still owns several direct pressables | Header pill now forwards its ref and composes with menu triggers | Converge page-header action feedback onto a small icon-button primitive |
| Primary buttons | `Button` plus fewer feature-local CTA pressables | Broadly adopted for button-like CTAs; remaining direct pressables are mostly not generic buttons | Shared button now defaults to button accessibility semantics, disabled state, non-selectable labels, native haptics, pressed scale, and label-style overrides; paywall, privacy unlock, onboarding, transaction review, living-plan receipts, banner save, and budget unlock guidance now use it | Continue migrating only true CTAs; do not force rows/cards into the button primitive |
| Icon buttons | `IconButton`, `HeaderActionPill`, and a few feature-local icon controls | New standard compact-control primitive; useful for close, back, header, and month-arrow actions | Added `IconButton` and migrated page headers, settings back, Ask close, paywall close, living-plan close, transaction-detail close, banner action icons, budget month arrows, and forecast close | Migrate remaining close/search-clear controls when touching their owning surfaces |
| Settings | `SettingsPage`, `SettingsGroup`, `SettingsRow`, `SettingsToggleRow`, `KwiltSwitch` | Good local grammar and strong reuse within settings | Removed nested interactive switch behavior from toggle rows | Migrate remaining settings-like rows before extracting across apps |
| Toasts | `Toast` and `ToastProvider` | Shared and visually coherent; prior 220ms travel felt slower than a transient acknowledgment | Shortened to 160ms/120ms, reduced travel, added live-region/alert semantics | Add announcement verification with VoiceOver |
| Full-screen education and handoff | Onboarding, first-visit explainer, and Kwilt handoff use platform `Modal` transitions | Correct surface type, but `fade`/`slide` presets do not yet share the motion system | No behavior change in this pass | Treat each as a flow-level review; do not replace them with drawers for consistency alone |
| Tab bar | `KwiltTabBar` | Shared layout and selection indicator; tab/action presses previously had limited tactile feedback | Added pressed scale/opacity and native selection haptics for place tabs and the Ask action | Consider a reduced-motion-aware indicator timing token after visual QA |
| Inputs | Eight feature-owned `TextInput` uses | Small set, but focus, error, disabled, and keyboard behavior are not centralized | No behavior change in this pass | Inventory field states before creating a generic input; avoid a visual-only wrapper |
| Alerts | Platform `Alert.alert` | Standard and trustworthy for destructive/exceptional confirmation | Kept as-is | Audit copy and necessity separately; do not replace native alerts with branded modals |

## Reduction pass

- Removed the category screen's local menu state, modal, scrim, popover styles, row component, and undefined share behavior.
- Kept exactly one overflow entry point and the two actions with real destinations.
- Preserved the frosted header action instead of introducing a second trigger appearance.
- Added shared primitives only where the control was truly a button or compact icon action.
- Migrated 39 direct pressables out of screen-owned implementation without changing money behavior.
- Did not create a universal component abstraction around the remaining direct pressables. Semantics differ across rows, tabs, cards, image tiles, segmented choices, text-input clear controls, and month labels; forcing them through one visual wrapper would hide rather than resolve inconsistency.

## Quality score

| Category | Status | Evidence |
|---|---|---|
| Job clarity | PASS | The overflow reveals only the two relevant category actions. |
| Reduction | PASS | One-off modal code and the unsupported share row are absent. |
| Hierarchy | PASS | Existing header trigger and two plain menu rows remain the only visible hierarchy. |
| System fit | PASS | Category detail now uses the same menu and row grammar as the three inventory menus; common CTA and icon actions now route through `Button` or `IconButton`. |
| Interaction | PASS | On iPhone 17 Pro / iOS 26.5, the overflow opened immediately, rendered both rows, dismissed cleanly, and both actions reached their existing destinations. |
| States | PASS WITH FOLLOW-UP | Touch open/dismiss and named VoiceOver actions were exercised. System reduced-motion wiring exists in code; a manual Settings toggle comparison remains useful visual follow-up. |
| Resilience | PASS WITH FOLLOW-UP | The live 393pt-class phone kept the popover inside the right gutter. Long labels and larger text sizes remain visual-regression candidates. |
| Runtime proof | PASS | Fixture-backed current checkout: Summary -> Housing -> overflow. `Category settings` opened `Housing settings`; `Edit header image` opened the `Budget Banner` drawer. |

## Runtime evidence

- Device: iPhone 17 Pro simulator, iOS 26.5.
- Runtime: local Expo development client with `EXPO_PUBLIC_KWILT_BUDGET_SCREENSHOT_PREVIEW=1`.
- Render: the menu stayed anchored beneath the existing frosted overflow pill, with two 44pt rows and no full-screen fade.
- Accessibility: the portal exposes a focused `Menu` element with the hint `Swipe up or down to choose an action` and the named actions `Category settings` and `Edit header image`.
- Destination proof: invoking each named action closed the menu and opened the correct settings page or banner drawer.

## Definition of done for the broader inventory

The menu and transient-surface seam now has simulator proof. The broader shared-control sweep reduced direct `Pressable` use from 112 to 73 and moved common CTAs/icon controls onto shared primitives with haptics, pressed feedback, accessibility state, and disabled handling. The remaining component-system work is narrower and should be handled as real screen reviews: inputs, image selection tiles, transaction/category rows, segmented choices, and empty/error states each need their own runtime proof rather than a blind wrapper migration.
