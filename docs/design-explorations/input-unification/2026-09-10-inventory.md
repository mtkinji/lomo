# Input patterns: inventory and design directions

Status: initial exploration retained as source evidence. Andrew approved the filled-field direction on September 10, 2026 and requested comprehensive implementation planning and canonical future authoring. The [canonical input contract](../../design-system/input-guidance.md), [implementation plan](../../superpowers/plans/2026-09-10-input-unification.md) and [migration coverage](migration-coverage.md) supersede proposal/deferred language below. No production migration or native acceptance is claimed by this inventory.

## What I see

Andrew's reference favors a clearly bounded writing area defined by a contrasting neutral fill, without a resting border. Its other useful qualities are generous interior space, a quiet label outside the field, and writing tools belonging to one enclosing surface. The reference's exact color, photography, dimensions, and Post placement are not requirements.

The strongest opportunity is to make an input family recognizable across Kwilt while preserving the different jobs of entering a value, composing a thought, searching, selecting, and editing content in place.

### Evidence and scope

- Source reviewed on September 10, 2026 in `/Users/andrewwatanabe/Kwilt`, branch `main`, HEAD `9baf1a4a8e14b83e806c1df9e25ee4d3e66d0678`, with substantial pre-existing uncommitted work, including `Input.tsx`, keyboard containers, and Home. Findings refer to the working files, not just that commit.
- Package dependencies identify Expo 55 and React Native 0.83.10. The older SDK 54 description in AGENTS.md is not the current dependency evidence.
- An AST scan examined 1,610 non-test JavaScript/TypeScript files under `src` and `packages`. The companion [call-site inventory](input-call-sites.csv) records recognized input/field JSX with source locations and explicit styling props.
- Scope centers on text entry and adjacent field surfaces (search, amount/code entry, picker triggers, notes and composers). It is not a complete inventory of switches, sliders, gesture inputs or platform-owned date/time controls.
- Feature counts cover `src/features` and `src/capabilities`, excluding `src/features/dev`; they include admin and potentially legacy/unreachable code. They are source call sites, not screens, unique runtime fields, usage frequency, or reachability proof. Repeated rows and local wrapper calls can multiply runtime inputs. Namespace/dynamic component aliases are not exhaustively resolved.
- The native app's Unified Chat WebView was traced to the companion website's composer implementation. That targeted inspection is separate from the native counts; marketing and guest web forms were not inventoried.
- This is a source audit and conceptual visual study. No Simulator session, signed build, screen-reader session, or native visual acceptance was performed. Existing runtime ownership was left alone.

### Inventory

| Family | Current evidence | Unification opportunity | Preserve |
| --- | --- | --- | --- |
| Ordinary text and value entry | 68 shared `Input` sites in 37 feature files. 43 omit a variant; 14 use `outline`, 4 `filled`, 6 `inline`, 1 `ghost`. | Make flat, visibly filled fields the proposed default for standard forms. Align names, spacing, typography, and state behavior. | Persistent labels, descriptions, validation, secure entry, keyboard types, autofill, return behavior. |
| Feature-owned native inputs | 50 direct native `TextInput` sites in 32 feature files, including aliases such as `RNTextInput`. Food, Games, Explore, Goals, and older AI surfaces are prominent. | Migrate ordinary fields through the owned UI layer; retain scoped adapters for special behavior. | Game code formatting, ingredient editing, dynamic row sizes, draft persistence. |
| Inline editable content | 2 `EditableField` sites and 3 `NarrativeEditableTitle` sites, plus 6 inline `Input` sites. `EditableTextArea` exists but has no recognized JSX consumer in the scanned production source. | One documented inline editing grammar; assess the unused textarea before extending it. | Heading typography, checklist density, commit/cancel semantics; values should still look like content. |
| Long-form and rich notes | 6 `LongTextField` sites. Its `card`, `filled`, and `flat` appearances wrap a preview that opens a rich editor. | Match the preview surface to the field family and give the editor its own documented composition. | Rich formatting, link/AI tools, editor opening, autosave and close behavior. A preview is not a live textarea. |
| Search | Goals uses `filled` + `flat`; Global Search uses the default; Money category search uses `filled` + `flat`; Explore uses a custom filled, bordered shell. | A shared SearchField composition with consistent icon, clear action, height, fill, and accessible name. | Search-specific capitalization/correction settings, result logic, native clear semantics. |
| Picker triggers | Canonical `PickerFieldTrigger`, `EnumPickerField`, and `SmallSetPickerField` use a shared closed-field grammar. The trigger renders a non-editable `Input` inside a pressable and defaults to `outline`. | Match text fields' fill, radius, and vertical rhythm; keep selection visibly distinguishable with its chevron/value. | Button semantics, selection behavior, searchable relation pickers, compact sentence pickers. |
| Composers and replies | Home post uses `ghost`; Home reply uses default `Input`; Goal check-in uses a local input inside a separate card; To-do quick capture owns its native input and container. | A common writing material and composition: one enclosing surface with transparent editable text; optional tools live in that surface. | Per-feature send/save actions, draft behavior, attachments, audience context, keyboard-container ownership. |
| Embedded web chat | `UnifiedChatScreen.tsx:2120` loads the web workbench. `kwilt-site/components/unified-chat/KwiltChatWorkbench.tsx:610` uses a web `Textarea`; its composer shell has a border, panel radius, and no shadow. | Carry agreed semantic material roles to web components and composer CSS as a separate migration. | Web/native bridge, conversation/voice modes, browser focus, existing composer geometry. |

### Concrete sources of drift

1. **Variant names do not describe distinct results.** `Input.tsx:252` sets a 1-point border. Both `surface` and `outline` only set a white background at `Input.tsx:316`, so they inherit the same border. Comments describe a borderless default that the actual style composition does not produce.
2. **`ghost` is not fully open.** It removes the fill and shadow but inherits the base border. Home's `variant="ghost"` at `SharedLifeComposer.tsx:601` therefore does not express the proposed open or softly filled writing treatment.
3. **Filled is already present but weak and opt-in.** `colors.fieldFill` is `#FAFAFA`, very close to white. `filled` removes the resting border but still inherits the default soft elevation unless `elevation="flat"` is passed. Only four feature call sites explicitly select it, one in Super Admin tools.
4. **Similar jobs use different materials.** Global Search, Goals search, Money category search, and Explore search take different paths through the component system. Recipe ingredients have a filled background plus a border; Games join fields use separate paper colors, a 17-point radius, and 58-point height.
5. **Typography is inconsistent as well as containment.** Shared `Input` uses 14-point `bodySm`; several custom editors use 17-point `body`. A fill-only change would leave this difference intact.
6. **Geometry is partially tokenized.** `radii.input = 12` already exists, yet the shared input and several related components repeat numeric radii. Search, Games, notes, and composer shells have additional local values.
7. **States have different meanings.** Filled fields gain a focus/error stroke; other variants largely retain a neutral border and use an accent label. `EditableField` owns local validation and commit behavior. `FormField` has explicit error identity/announcement anatomy, while `Input` owns its own label/hint handling. Align semantics deliberately, without wrapping text inputs in duplicate labels.
8. **The review documentation lags component maturity.** The inventory says `Input` is Canonical; some Storybook descriptions still call these primitives candidates. The component inventory wins. Add accurate usage guidance and composition stories rather than treating a folder location as approval.

## The anchor in play

This serves `jtbd-capture-and-find-meaning` and `jtbd-trust-this-app-with-my-life`: capture should feel easy, and interactions should be predictable.

Design principle: **Make it obvious where a thought or value belongs, with the least visual friction that still makes editing and state clear.**

Authority: Andrew's explicit direction and accepted behavior → native/accessibility requirements → Kwilt constitution, semantic tokens and Canonical components → RNR anatomy → scoped local precedents. The reference image informs visual relationships only. Preserve its filled boundary and generous writing space; translate color, typography and geometry; do not adopt its action placement or content as product requirements.

## References worth knowing

Reviewed September 10, 2026. These inform different parts of the decision; they are not replacement themes.

| Reference | Useful quality | Translate / do not copy |
| --- | --- | --- |
| [Material Web filled and outlined text fields](https://github.com/material-components/material-web/blob/main/docs/components/text-field.md) | Distinct field types with labels, supporting/error text, icons and prefix/suffix anatomy. | Borrow explicit variant/state contracts; retain Kwilt labels, geometry and native behavior. Do not import Material's floating labels or underline as a requirement. |
| [RNR Input](https://reactnativereusables.com/docs/components/input) and [Textarea](https://reactnativereusables.com/docs/components/textarea) | The project's selected upstream component reference and separate single/multiline component surfaces. | Compare anatomy during implementation; retain the owned native wrapper and current styling system. Documentation pages were reachable but yielded little extractable detail, so no source-equivalence or state-completeness claim is made. |
| [Apple text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields) | Platform reference for text entry. | Use for native behavior validation. The page is JavaScript-rendered in this retrieval, so this audit does not attribute unverified detailed recommendations to it. |
| Kwilt Goals inventory search | Existing `Input` with `filled` and `flat`, a leading search icon, and explicitly labeled clear action. | A useful local candidate for a common search composition; its occurrence alone does not grant a new app-wide pattern Canonical status. |

## Three sketches

Axis: where the visual boundary belongs—each field, the group, or the content region.

### A. Soft filled fields — recommended starting point

Labels sit above clearly filled fields. Ordinary fields use the input radius; multi-line writing gets more interior space. Search and picker triggers share the same material with their own icons. Composers use one filled outer surface with transparent text and an optional tool row. No resting stroke or shadow for embedded fields. Focus and errors remain explicit.

Best for broad consistency and easy recognition in mixed forms. Risks: many filled rectangles can become monotonous in dense metadata or long recipe lists. Keep inline content and existing grouped settings as documented exceptions.

Anchor fit: a visible place to type supports low-friction capture. Grounding: Andrew's reference, Kwilt's filled variant/search precedent, and the explicit filled-field category in Material.

### B. Grouped form rows

A related set of values shares one softly filled group. Labels and values sit in rows; separators are used only where the grouping needs them. Text controls are transparent inside the group. Notes can occupy a larger final row. Standalone search remains a distinct field; writing still gets a coherent composing region.

Best for household settings, dense details, and short related metadata. Risks: long labels, multiline values and several validation messages can undermine alignment. It can make open-ended creation feel administrative.

Anchor fit: fewer repeated boundaries make routine upkeep easier to scan. Grounding: Kwilt's Canonical grouped settings anatomy. This is a proposed editing composition, not an existing approved form pattern.

### C. Open editorial editing

Titles and notes sit directly on the page, with a clear edit cue or dedicated editing context. Controls appear with focus; labels and spacing structure the page. Filled utility fields remain available for search, identifiers, and constrained amounts.

Best for Goal/Arc titles, reflections, and focused writing. Risks: ordinary forms become ambiguous, especially while empty; validation needs careful placement. Does not provide the same visible invitation as the supplied mockup.

Anchor fit: expression feels like writing content. Grounding: `NarrativeEditableTitle` and `LongTextField`'s open read surface; preserve their distinct interaction contracts.

## Recommended design-system refinements

1. **Define materials before adding components.** Propose filled, plain, and outlined treatments with a clear usage rule. Keep old public names as compatibility aliases during any migration; do not introduce another competing input implementation. Filled should imply flat by default. Outlined remains an intentional context/accessibility choice.
2. **Give semantic fill roles enough visible separation.** Start by comparing the existing warm neutral `gray100`/`sumi100` (`#F5F5F4`) against the current `gray50` (`#FAFAFA`) and a slightly stronger candidate. Do not use the pressed-state token as the resting role simply because its current color looks right. Evaluate against both white and muted parent surfaces. Introduce an explicit on-muted surface role only if those comparisons show it is needed.
3. **Standardize anatomy, not persistence.** Label, value/control, optional help, and error should align across text and pickers. Ordinary text values should be reviewed at body size (17pt), with a deliberate compact treatment. Preserve 44pt minimum interactive targets and Dynamic Type; avoid fixed heights that clip large text.
4. **Let a composition own its outer surface.** A composer or grouped form owns the fill; inner text controls are plain. This avoids box-within-box appearance and redundant borders. Field radius can stay `radii.input`; review a composer role against existing `compactCard`/panel geometry without equating a composer to a card.
5. **Make states stable.** Resting: neutral fill. Focus: visible caret plus a clearly perceivable focus indicator, without adding border width that moves text. Error: specific message with semantic announcement and a corresponding cue. Disabled and read-only must remain distinguishable; a picker whose internal text is non-editable is still an enabled control.
6. **Create composition stories.** Review standard forms, search, mixed text/picker forms, notes previews, and writing surfaces in empty, filled, focused, error, disabled, long-text and large-text states. Include white/muted parents. Align Storybook descriptions with actual maturity.
7. **Converge callers by job.** Search and ordinary fields offer the clearest early consistency wins. Recipes and Games need behavioral review before mechanical migration. Keep rich editor, To-do capture and web chat geometry changes separately reviewable.

Soft fill is not an accessibility certificate. The current `#FAFAFA` on white is approximately 1.04:1; `#F5F5F4` is about 1.09:1. When the fill is the only means of identifying an input, it does not meet the 3:1 non-text contrast criterion. Evaluate the complete control and its cues; a border is not universally required, but focus and required identifying information must remain perceivable. See [W3C's non-text contrast guidance and text-input examples](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). A focus ring alone does not resolve an unidentifiable resting field.

## First slice to review

Use three real surfaces to test A before an app-wide default change:

1. Home writing/reply: invitation, one containing surface, long-text behavior.
2. Chore editor: ordinary field, picker trigger, and multiline definition in one form.
3. Global Search alongside Goals and Money category search: consistency and compact behavior.

Bet: much of the perceived inconsistency comes from material, spacing, and typography differing for the same input job. If A still feels busy, use B for dense metadata. If it still feels too form-like for reflection, use C in that writing context.

Success signals: users recognize the editable region while empty; filled and error states keep the same layout; mixed controls feel related; text and the completion action remain visible with the native keyboard and long content. A mockup or passing unit tests cannot prove the keyboard criterion.

Deferred decisions: exact fill values, default body size, composer radius, migration order, focus treatment, and which grouped/editorial contexts earn explicit exceptions. No implementation, default flip, publish action, runtime acceptance, or promotion has been approved by this exploration.

## Source map

- [Shared Input](../../../src/ui/Input.tsx), [FormField](../../../src/ui/FormField.tsx), [picker fields](../../../src/ui/PickerFields.tsx).
- [EditableField](../../../src/ui/EditableField.tsx), [EditableTextArea](../../../src/ui/EditableTextArea.tsx), [NarrativeEditableTitle](../../../src/ui/NarrativeEditableTitle.tsx), [LongTextField](../../../src/ui/LongTextField.tsx).
- [Color roles](../../../packages/kwilt-tokens/src/colors.ts), [radii](../../../packages/kwilt-tokens/src/radii.ts), [typography](../../../packages/kwilt-tokens/src/typography.ts).
- [Home composer](../../../src/features/shared-home/SharedLifeComposer.tsx), [Home reply](../../../src/features/shared-home/SharedLifeConversation.tsx), [Chore editor](../../../src/capabilities/chores/components/ChoreEditorDrawer.tsx).
- [Global Search](../../../src/features/search/GlobalSearchDrawer.tsx), [Goals search](../../../src/features/goals/GoalsInventorySearchBar.tsx), [Money category search](../../../src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx), [Explore](../../../src/capabilities/explore/screens/ExploreMapScreen.tsx).
- [Recipe fields](../../../src/capabilities/recipes/screens/RecipeEditScreen.tsx), [ingredient lines](../../../src/capabilities/recipes/components/IngredientLineEditor.tsx), [Games join fields](../../../src/capabilities/games/features/remote/JoinTableDrawer.tsx), [Goal check-in](../../../src/features/goals/CheckinComposer.tsx), [To-do capture](../../../src/features/activities/QuickAddDock.tsx).
- [Native Unified Chat host](../../../src/features/unifiedChat/UnifiedChatScreen.tsx). Companion web implementation: `/Users/andrewwatanabe/kwilt-site/components/unified-chat/KwiltChatWorkbench.tsx` and `KwiltChatWorkbench.module.css`.
