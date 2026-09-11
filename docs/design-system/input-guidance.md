# Canonical input treatment

Owner: Andrew. Design direction approved September 10, 2026 after the [input inventory and three-direction study](../design-explorations/input-unification/2026-09-10-inventory.md): a shared filled-field family, with deliberate grouped and inline/editorial exceptions. Andrew requested comprehensive migration and a canonical treatment for future development.

**Authority and delivery status:** This is the approved design and authoring contract. `Input` remains the Canonical production entry point. Its current implementation does not yet satisfy all of this contract. The [implementation plan](../superpowers/plans/2026-09-10-input-unification.md) owns convergence and proof. New adapters, token values and composition changes require the plan's rendered acceptance before being described as implemented or added as Canonical implementations to the inventory. Approval of the direction is not a native-runtime receipt.

## Governing rule

Use a contrasting neutral fill to define ordinary editable fields. No resting perimeter stroke or shadow by default. Labels, text rhythm, spacing and states are consistent across the app. Preserve the job and behavior of each control: a search box, a picker, an inline title and a composer may share material without sharing persistence or completion semantics.

Required references: [UI constitution](ui-constitution.md), [component inventory](component-inventory.md), [pattern atlas](pattern-atlas.md), [keyboard implementation guide](../keyboard-input-safety-implementation.md). The separate [text-editing behavior PRD](../feature-briefs/keyboard-input-safety.md) was a draft at approval; this visual contract does not silently approve its proposed behavior. Recheck its status before changing shared input behavior.

## Choose the pattern by job

| Job | Owned entry point | Treatment | Do not change as a styling side effect |
| --- | --- | --- | --- |
| One text, numeric, email, password, code or URL value | `Input` | Filled field with visible label; domain-specific prefix/suffix or keyboard as needed. | Parsing, formatting, secure entry, autofill, capitalization, validation, Next/Done/submit behavior. |
| Paragraph in a form | `Input multiline` | Filled field; bounded growth and text scrolling follow the host contract. | Parent draft, explicit Save, newline insertion and height policy. |
| Search | `SearchField` | Same fill and radius, leading search icon, one accessible clear mechanism. | Query state, filtering/debounce, selection, result scopes or submission. |
| Message, reply or short post | `Input multiline` in its composer composition | One filled outer surface; tools may occupy an internal footer slot. Label/help/audience stay in their established appropriate region. | Send/Post placement, publication, attachments, draft/retry, keyboard hosting. The reference image does not move Post into every composer. |
| Choice or relationship | Existing picker family | Matching material and field rhythm, readable selected value and clear selection/disclosure cue. | Button semantics, sheet selection rules, clear/deselect, immediate selection versus explicit Save. |
| Heading, checklist step, or editable sentence fragment | `TitleInput` for parent-owned heading drafts; `NarrativeEditableTitle` for tap-to-edit headings; existing inline adapter / `Input variant="inline"` for fragments | Plain content treatment with the established edit cue and typography. Editorial adapters retain Candidate maturity while native acceptance remains open. | Tap activation, content sizing, commit-on-blur/submit, cancel, restoration, keyboard action. |
| Related short values inside an accepted grouped form | Existing group + owned plain controls | One group surface; internal controls do not create more boxes. | Group membership or row navigation. Grouped treatment needs a documented context, not developer preference. |
| Rich notes preview | `LongTextField` | Filled preview in a form, plain only in a documented editorial context. | Preview-to-editor navigation, HTML/rich formatting, autosave, link/AI tools. |
| Embedded web workbench | Site-owned `Input`/`Textarea` and composer | Same agreed semantic material, typography and states through a native-to-web mapping. | Browser focus, native bridge, voice/live modes, attachments, web layout. |

Platform-owned switches, sliders, date/time wheels and selection UI remain native. Field-like triggers surrounding them follow the family where appropriate. A control is not a text input because it occupies a rounded rectangle.

## Materials and anatomy

Three intentional materials:

- **Filled:** default ordinary field, search, picker and embedded writing surface.
- **Plain:** transparent content inside an already defined input/group surface or a documented editorial context. `inline` adds its existing content-sizing semantics; material alone must not turn a paragraph into an inline value.
- **Outlined:** explicit contextual or accessibility exception. It is not another default or a feature-local preference.

Legacy `surface` and `ghost` input variants have been removed after caller reconciliation. Use the supported filled, plain, inline or reviewed outline treatment; do not reintroduce compatibility aliases.

One field consists of an optional visible label where context already supplies a label, one control region, optional concise description, and associated error text. Every control has an accessible name. A placeholder supplements a form label; it does not replace one. Search and compact composers may use a contextual visible cue plus an explicit accessible name. `Input` owns this text-field anatomy; do not wrap it in another `FormField` that repeats its label/error.

The shared frame owns fill, outline/focus treatment, radius, padding and disabled material. The native input owns text editing. A composer can add a footer of feature-owned controls to that frame, but never nests a filled textbox inside a filled composer. Use `Input` slots and an internal shared frame; do not build a second text-input implementation.

### Initial implementation values

These are concrete starting values for the pilot, pending rendered contrast and typography acceptance. Any adjustment belongs in the shared tokens, not in pilot feature styles.

| Role | Initial value / source | Rule |
| --- | --- | --- |
| Ordinary input fill | New `colors.inputFill = #F5F5F4` | Separate from legacy `fieldFill`, which is also used by many non-input surfaces. |
| Pressed field/picker fill | New `colors.inputFillPressed = #E7E5E4` | Interaction state only, not validation or selection meaning. |
| Field directly on a muted canvas | New `colors.inputFillOnMuted = #FFFFFF` | Selected with the shared `onSurface="muted"` context; use the field's actual immediate background. Do not infer from app section name. |
| Focus | Existing `colors.accent`, 2pt indicator for filled/outline fields | Plain and inline editors retain their borderless host treatment, using the native caret and selection as editing cues. Filled/outline indicators are drawn without changing layout. |
| Error | Existing `colors.destructive`, associated message | Error wins over focus color; never color-only. |
| Outlined exception | `colors.muted` starting contrast candidate | Measure against adjacent colors; legacy pale `border` is not assumed sufficient. |
| Radius | `radii.input = 12` | Ordinary fields and search. No local numeric radii. |
| Composer radius | New `radii.composer = 16` | A distinct input role, not a promotion of `Card`. Existing floating dock geometry remains owned by its frame. |
| Ordinary entry text | `typography.body` (17pt / 24pt) | Preserve the native single-line baseline adjustment; do not force a 24pt line-height inside a fixed short input. |
| Compact entry text | `typography.bodySm` (14pt / 20pt) | Explicit compact context only, such as sentence fragments/dense inline metadata. Not a shortcut for shrinking ordinary mobile forms. |
| Labels and descriptions | Existing neutral body/label roles | Label remains neutral on focus. Existing heading/inline font roles remain intact. |
| Hit target / height | 44pt minimum target; ordinary field 48pt minimum | Allow text scaling to increase height. Compact visual treatment does not reduce the target. |
| Interior spacing | Existing spacing roles, initially 12pt horizontal / 8pt vertical | Composer: 16pt interior. Values belong in the common appearance resolver. No new spacing scale. |
| Multiline sizing | Existing per-caller contract and shared keyboard limits | The current 112–220pt default is a compatibility baseline. This visual migration does not prescribe a new universal cap. |

Neutral fill must remain distinct from its immediate parent. A white field on a muted parent can satisfy the visual direction just as a muted field on white can. Do not darken an entire page to make a field legible, reuse a disabled appearance for an enabled picker, or choose a colored brand fill as decoration.

The web workbench currently defines its own CSS colors and does not consume `@kwilt/tokens` as a package dependency. Its input-role mapping must be explicit and checked; rebuilding native tokens alone cannot prove propagation. Do not restyle site secondary buttons by repurposing their existing `--kw-field-fill` variable.

The legacy-token audit classifies all90 property references across49 consumer files, plus the token definition as the50th lexical file.13 references belong to text controls and6 to field-like choice triggers; their feature waves own migration. Other references describe shared compatibility branches, action/selection states, cards, lists, native groups, a popup or a slider track. Preserve those distinct roles; the complete classification is in [legacy fill consumers](../design-explorations/input-unification/legacy-fill-consumers.csv).

## Required states and accessibility

| State | Contract |
| --- | --- |
| Empty | Recognizable editable region, persistent contextual label, useful placeholder where needed. |
| Populated | Same geometry and hierarchy; long values wrap or scroll according to their job. |
| Focused | Visible caret/selection and appropriate focus indicator; no reflow or shift from adding border width. No automatic accent label. |
| Error | Specific associated message and accessible invalid/error information; recoverable text stays present. Check label/control/message traversal and announcement on device. |
| Disabled | Noninteractive control with disabled semantics; nearby reason when needed. Label/help stay readable. |
| Read-only | Readable value and truthful semantics. Do not present every non-editable text renderer as a disabled field; enabled pickers remain full-strength buttons. |
| Loading/saving | Feature owns the operation; field does not invent saving state or claim durability. Preserve its existing edit lock and draft behavior. |
| Large text / long content | No clipped label, value, error, tools or target. No exact height that prevents Dynamic Type. |

The light fill is not, by itself, sufficient accessibility proof. If the fill is the only way to identify the text input, assess its contrast as identifying information; the soft starting values do not reach 3:1 against white. Establish sufficient identifying cues or an explicit stronger treatment before acceptance. A focus ring only addresses focus, not an unidentifiable resting control. Verify normal and increased-contrast appearance, text contrast, VoiceOver/TalkBack and hardware-keyboard focus where supported. See [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

## Keyboard and persistence boundary

Keep exactly one layout owner for keyboard avoidance/viewport clearance. Shared field styling may expose intrinsic frame/tool height; it must not add another keyboard-height offset. Never remount the input on focus to get a different appearance.

Basic values have the same focus-visibility requirement as paragraphs. Use `KeyboardAwareScrollView` for ordinary editable forms; `SettingsPage` supplies it automatically. `Input` registers its complete field frame with that host so the fill, text and in-field tools clear the keyboard together. The host owns padding, minimal reveal, focus switches and keyboard frame changes. Existing drawer/composer hosts retain their own strategy; do not nest another avoidance layer. A plain native `ScrollView` around an input is not sufficient. The architecture check rejects new unmanaged scrolling-field sites and keeps exact custom-host exceptions reviewable.

For a field sharing a horizontal row with Add/Remove or another field, use `wrapperStyle={{ flex: 1, width: 'auto', minWidth: 0 }}`. `wrapperStyle` lays out the complete field, including label/help; `containerStyle` retains its existing inner-frame meaning. Putting flex only on the inner frame leaves the outer field at full row width and can clip its neighbor.

Before migrating a site, record meaning (paragraph/value/capture/rich), entry, keyboard action, completion, persistence, validation/empty behavior, sizing and host. Carry the record into review. Do not make Done save every form, make blur discard paragraphs, make Return send a message, or change rich notes to plain text. Overlapping edits to `Input`, `BottomDrawer`, or `KeyboardAwareScrollView` must be integrated in the ordinary checkout before runtime proof.

Use the platform Done/check return key when one focused, single-line field can complete a small, reversible task. Set `enterKeyHint="done"` (and retain `returnKeyType="done"` for compatibility), use `enablesReturnKeyAutomatically` when empty text cannot commit, and call the same validated commit path as the visible completion action. Keep that visible action in the owning drawer or screen for discoverability, accessibility, hardware keyboards and cases where the software keyboard is absent. Use Next for multi-field progression, Search for queries and the ordinary return key for multiline drafting; do not map the check to destructive or ambiguous work.

## Authoring examples and transition

**Current API:** Input defaults to filled, flat material with body text and neutral labels. The migration treatment prop and legacy renderer have been removed after source caller reconciliation. Native acceptance is separately tracked; do not imitate these tokens with feature overrides.

```tsx
<Input
  label="Chore"
  value={draft.title}
  onChangeText={(title) => setDraft((current) => ({ ...current, title }))}
  variant="filled"
  elevation="flat"
  accentLabelOnFocus={false}
/>
```

`onSurface` selects the immediate parent relationship; `surfaceRole` selects field/composer geometry. Optional `footerElement` puts existing tools inside the same surface. `SearchField` owns search mechanics, not result logic. Input and picker defaults are filled; do not pass the removed `treatment` prop. Surface/ghost input variants and elevated input material are unsupported; plain/inline editorial and explicit outline exceptions remain reviewed choices.

`LongTextField` uses the same filled rich-notes preview by default, with `onSurface` for parent contrast. Use `surfaceVariant="flat"` only for an accepted editorial context. Features import LongTextField, which owns rich editing, autosave and Done; its internal preview owns material. Native rich-editor acceptance remains open.

```tsx
<Input label="Chore" value={title} onChangeText={setTitle} />
<Input label="Note" multiline value={note} onChangeText={setNote} />
<Input label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
<Input label="Name" value={name} onChangeText={setName} onSurface="muted" />
<SearchField accessibilityLabel="Search goals" value={query} onChangeText={setQuery} />
<Input
  label="Your moment"
  multiline
  surfaceRole="composer"
  value={text}
  onChangeText={setText}
/>
```

`PickerFieldTrigger` accepts `clearAccessibilityLabel` for contextual actions such as “Clear location”; its default remains “Remove selection”. The shared clear action stops propagation before invoking the owning callback.

`TagEntryField` is the candidate owned composition for Activity tags: one shared filled frame, wrapped removable chips and a plain inner `Input`. It forwards native editing events; callers retain comma parsing, Done/blur commits, persistence and suggestion logic. Use `onRemoveTag` for chip actions and `onPressField` for host focus preparation. Native acceptance remains open.

## Rules for future development

1. Import the owned input/picker/inline adapter. No new feature-local native `TextInput`, textarea wrapper, or input-shaped pressable merely to get different styling.
2. Do not override fill, perimeter border, radius, shadow, text color or standard input typography in feature code. Layout-only placement is permitted. Inline semantic typography belongs to the inline adapter/approved pattern, not to an arbitrary override on a standard field.
3. Use one accessible clear mechanism in search and one label/error owner. Every icon-only action has a name and adequate target.
4. Add examples to the existing Storybook input family when introducing a supported composition or state. Keep inventory maturity accurate.
5. An exception identifies the exact site/adapter, job, reason, owner, tests/native evidence and removal or review condition. A whole capability/file allowlist is not an exception contract. Missing proof stays visible.
6. Architecture checks must reject newly introduced raw field construction, legacy variant usage and styling overrides. Existing debt is an exact, shrinking migration baseline. The AST check is now wired into architecture lint with exact, reasoned migration debt and owned-adapter exceptions. The baseline must shrink as migration completes; The migration flag is rejected; final exception/native acceptance review remains open.

## Definition of convergence

The [coverage ledger](../design-explorations/input-unification/migration-coverage.md) has no unresolved sites; supported adapters share the material contract; every retained exception has evidence; the embedded web surface is reconciled; future misuse fails CI; the component inventory and atlas name the actually proven implementations. Native keyboard-open and long-text evidence is required in representative hosts. Source, Storybook, Simulator, device, assistive-technology, CI and production receipts remain distinct.

Implementation receipts: [current evidence and open acceptance](evidence/input-unification/README.md). The presence of a component or a passing source test does not promote a new adapter to accepted Canonical maturity.


QuickAdd is an owned capture adapter: its expanded white drawer remains one continuous writing surface, with shared plain Input inside. Preserve the measured growth, leading checkbox and capability-owned action row; do not add a nested filled box or move its commit behavior into Input. Its exact inline-title typography exception matches the existing measured line-height contract. New ordinary capture fields still use the filled composer treatment. Native QuickAdd acceptance remains pending.


### Editorial title renderer

Use `TitleInput` from `src/ui/TitleInput` for controlled heading entry that must grow with the surrounding document. Use `NarrativeEditableTitle` when the existing interaction is tap-to-edit with validation and commit-on-finish. Do not replace a parent-controlled draft with commit-on-blur semantics. `TitleInput` requires an accessible name, forwards native refs/events, owns neutral plain heading material, and forces multiline/non-scrolling entry without paragraph height bounds. The parent owns keyboard scrolling. Matching display-heading typography may be supplied under an exact reviewed exception; this is not an ordinary form-field escape hatch.

This specialized owned renderer remains subject to native acceptance. The To-do persisted-title path has a long-text ending-caret/Done observation; draft titles, other hosts, selection edits, larger text and other platforms still need proof. Consolidate its native renderer into Input only if uncapped heading geometry and native caret behavior remain equivalent.


## Canonical catalog entry

Use **Forms → Input Family → Standalone Fields** for the supported text, search and small-set picker states on canvas and muted parents. **Embedded Editors** demonstrates the borderless plain editor inside an existing surface beside a standalone filled composer. Additional writing, rich-preview, tag and editorial-title adapters remain in Forms/Editing with their own maturity boundaries. These examples are implemented in [input-family.stories.tsx](stories/input-family.stories.tsx); copying a contextual plain variant into an ordinary form is not the default pattern.
