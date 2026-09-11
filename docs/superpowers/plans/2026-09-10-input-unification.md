# Input Unification Implementation Plan

> **For agentic workers:** Execute inline with the executing-plans skill, task by task. Steps use checkboxes. Do not spawn agents or create a worktree without Andrew's explicit choice. Implementation is in progress; see the execution record below.

**Goal:** Bring every in-scope Kwilt input onto the approved filled-field family, preserve editing semantics, and make future divergence fail review and automated checks.

**Architecture:** Evolve the existing Canonical `Input` and its owned picker/inline/rich adapters. Centralize material and geometry in an internal appearance resolver/frame, add a small `SearchField` composition, and let `Input` accept a composer surface role and optional tool footer. Use one native editing implementation and existing keyboard hosts. Migrate through explicit compatibility settings, account for every source site, align the embedded web workbench separately, then change defaults and remove the transition setting.

**Tech Stack:** Existing Expo 55 / React Native 0.83.10, React, TypeScript, StyleSheet, `@kwilt/tokens`, Jest, Storybook, Node/TypeScript AST tooling. Companion workbench: existing Next.js 14 / React 18 / CSS modules and web controls. No new UI library, styling engine, application, global feature flag, or runtime dependency.

**Binding design:** [Canonical input treatment](../../design-system/input-guidance.md). Andrew approved the filled-family direction and requested comprehensive migration/canonical authoring on September 10, 2026. Exact starting values are specified there; pilot rendering may refine shared values before convergence. No repeated approval of the direction is needed. New canonical implementation entries still need actual evidence.

**Source and ownership:** Normal checkout `/Users/andrewwatanabe/Kwilt`, `main`, HEAD `9baf1a4a8e14b83e806c1df9e25ee4d3e66d0678`, substantial unrelated dirty work. `Input`, Home, keyboard and drawer files already contain concurrent work. Inspect branch/HEAD/diff and reread every affected file before each edit. The site is `/Users/andrewwatanabe/kwilt-site`; inspect its own branch, HEAD, status and AGENTS.md before edits. Use ordinary branches; no automatic worktree. Only one checkout owns native/runtime verification. Record checkout, branch, commit, dirty state, installed build and Metro path/port for each native receipt. Do not switch the branch under another active task.

## Scope and completeness

The [migration coverage](../../design-explorations/input-unification/migration-coverage.md) assigns **182 native-source JSX sites across 85 files** to Tasks 02–08. The [ledger](../../design-explorations/input-unification/migration-ledger.csv) records each site. This is the starting source snapshot, not a reachability census; refresh it in Task 01. It includes admin/dev/legacy and shared internals so they cannot disappear from accounting. Add embedded web sites under a separate ID namespace in Task 09.

The completion equation is:

```text
all discovered in-scope sites
  = migrated with evidence
  + retained exact exceptions with evidence
  + removed and verified unused
unclassified / silently excluded / planned sites at completion = 0
```

Text-like picker triggers, structured amount/code entry and rich/composer adapters are in scope. Switches, sliders, platform date/time controls and public marketing/guest forms are not being redesigned. Include their closed field triggers and any collateral effects from shared source/token changes. Do not mark desktop or the entire website converged from mobile proof.

## Delivery map

| Task | Deliverable / responsibility | Exit gate |
| --- | --- | --- |
| 01 | Refreshed census, per-site behavior records, no-new-debt check | Every current site assigned; new raw controls and overrides rejected |
| 02 | Tokens, common appearance/frame, compatibility bridge | New treatment available without changing unknown callers |
| 03 | Search, picker, inline and rich preview adapters | Shared material with native semantics preserved |
| 04 | Home, Chore and search pilots | Accepted native composition and keyboard proof |
| 05 | Remaining ordinary forms | 40 starting sites dispositioned |
| 06 | Food forms and repeating editors | 22 starting sites dispositioned |
| 07 | Money, Explore and Games | 19 starting sites dispositioned |
| 08 | Inline, rich notes, capture and legacy AI | 60 starting sites dispositioned |
| 09 | Embedded web workbench | Explicit token mapping plus browser and native-host proof |
| 10 | Default switch and compatibility cleanup | No transitional or unclassified caller remains |
| 11 | Permanent enforcement, Storybook and maturity records | CI blocks divergence; documented evidence matches reality |
| 12 | Integration review and acceptance receipt | Actual candidate passes required automated and runtime gates |

Counts describe the original ledger; Task 01 and later discovery may increase them. Shared foundation/adapters cover 29 starting sites; pilots cover 12. Never hold the denominator fixed to make completion look better.

## Verification posture and repeated slice protocol

TDD is required for scanner/policy logic, compatibility logic, branching hooks and changed commit/queue behavior. Regression-first for a reproduced bug. Presentational changes use component stories and native review; do not create tests that simply assert a new color/radius or component tree. Preserve existing focused tests.

Each caller migration is a small action sequence:

1. Read the exact ledger row, current file, closest existing tests and behavior record; fill any missing behavior before editing.
2. For a behavior-bearing wrapper conversion, add/run the focused failing characterization only where the new path could lose a real contract. Do not rewrite existing semantics to fit the wrapper.
3. Replace the control/import, choose the shared treatment and delete only superseded local visual styles. Keep parsing, validation, refs, event handlers, native props and host layout.
4. Run the focused related test(s), then render the affected host with realistic empty/filled/long/error content. Record source and applicable runtime evidence on that row.
5. Set a terminal disposition only with evidence. Stage/commit only an independently verified, intended slice at a normal checkpoint; never use `git add .` in this dirty checkout. A commit does not imply merge/push approval.

At each completed task/slice, run once with its actual file list:

```bash
npm run verify:local -- --run --files src/ui/Input.tsx src/ui/Input.accessibility.test.tsx
```

The two paths above are the concrete Input-slice example; use the actual selected paths for each other slice. Inspect the omitted-file report. Reuse reports only while inputs match; consult `npm run verify:local -- --report` before repeating an unchanged gate. Do not substitute scoped local results for `npm run verify:changed -- --run` before integration. Do not run the full Jest suite after every field.

## Task 01: Refresh discovery and prevent new divergence

**Files:** Create `scripts/input-patterns/scan.mjs`, `scan.test.mjs`, `policy.mjs`, `policy.test.mjs`, `cli.mjs`, `baseline.json`. Update `scripts/architecture-lint.mjs`, `package.json`, and the three inventory/coverage CSV/Markdown artifacts under `docs/design-explorations/input-unification/`.

- [ ] Snapshot the actual input files and record each row's entry point, text meaning, entry behavior, keyboard action, completion, persistence, empty/invalid policy, sizing and host. Trace legacy AI, admin/dev and unused wrappers before assigning a runtime claim. Use references to existing behavior contracts; this task does not accept the separate draft keyboard PRD.
- [x] Implement `scanInputSites({ file, source })` as a pure TypeScript-AST scan returning `{ kind, file, component, line, owner, fingerprint }[]`. `owner` identifies the enclosing function/class/control site; fingerprint normalizes the JSX/call subtree without whitespace/locations. Recognize named aliases, namespace/default React Native members, re-exports/local wrappers where statically resolvable, native `createElement`, shared `Input`/picker/inline/rich sites, and embedded markup. Emit unresolved dynamic constructions for explicit review instead of silently skipping them. Type-only imports, ref types and `TextInput.State` are not rendered raw inputs.
- [x] Start with these executable Node regression fixtures; add namespace, require/import alias, wrapped JSX, dynamic construction and formatting-move cases before implementing their paths:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { scanInputSites } from './scan.mjs';

test('detects an aliased native field', () => {
  const sites = scanInputSites({ file: 'src/features/demo/Form.tsx', source:
    'import { TextInput as NativeEntry } from "react-native"; export const Form = () => <NativeEntry />;' });
  assert.equal(sites.filter(site => site.kind === 'raw-native-input').length, 1);
});

test('allows native ref types without treating them as controls', () => {
  const sites = scanInputSites({ file: 'src/features/demo/Form.tsx', source:
    'import type { TextInput } from "react-native"; let ref: TextInput | null = null;' });
  assert.equal(sites.filter(site => site.kind === 'raw-native-input').length, 0);
});
```

- [x] Run `node --test scripts/input-patterns/scan.test.mjs`; confirm the relevant new fixture fails before adding its detection. Implement with the already installed TypeScript parser, then rerun to green.
- [x] Implement `assessInputPolicy({ currentSites, baselineSites, exceptions })` returning findings. Match legacy debt by exact site fingerprint and multiplicity, not whole file or count-only comparison. Adding a second raw field inside an already grandfathered file must fail; deleting one raw field and adding a different raw field must fail; removing debt must pass. Allow native construction only in named owned internals or an exact recorded exception. Tests must cover all three cases, stale exceptions and unresolved dynamic constructions.
- [x] Detect new legacy variants, elevated embedded fields, and input-targeted appearance overrides. Resolve local StyleSheet identifiers, composed arrays, inline style objects and statically known spreads. Reject unresolved input appearance spreads outside owned adapters unless an exact reviewed exception covers them. Allow layout placement and type-only refs. Inspect wrappers recursively; a renamed feature `Field` cannot bypass policy.
- [x] Baseline only the observed existing debt, with reason and task/site IDs. Check the baseline diff in review; do not provide an automatic “accept current violations” command. Add a named check-mode invocation `node scripts/input-patterns/cli.mjs --check` to `architecture-lint.mjs` and add `node --test scripts/input-patterns/*.test.mjs` to the existing architecture test command. The CLI must return nonzero on findings or a corrupt/missing baseline; emit exact actionable sites.
- [ ] Run the focused scanner/policy tests and `npm run architecture:lint`. Confirm current debt is accounted for, new fixture debt is rejected, and existing lint rules remain intact. Update the coverage denominator and assign new sites before proceeding.

## Task 02: Implement one shared treatment behind explicit migration

**Files:** Modify `packages/kwilt-tokens/src/colors.ts`, `radii.ts`, `src/ui/Input.tsx`, `src/ui/Input.accessibility.test.tsx`. Create `src/ui/inputAppearance.ts` and `src/ui/InputFrame.tsx` (internal). Update `docs/design-system/stories/primitives.stories.tsx`, `overlays-and-forms.stories.tsx`, and `editing.stories.tsx`.

- [x] Classify all 50 lexical legacy token-consumer files listed in coverage. Preserve the current `fieldFill`/`fieldFillPressed` values, including non-input cards/buttons. Add only input-specific roles with the guide's pilot values:

```ts
// Add inside the existing colors object; leave legacy fieldFill roles unchanged.
inputFill: '#F5F5F4',
inputFillPressed: '#E7E5E4',
inputFillOnMuted: '#FFFFFF',
// Add inside the existing radii object.
composer: 16,
```

- [x] Introduce a temporary internal migration prop `treatment?: 'legacy' | 'unified'`, initially defaulting to `legacy`. Resolve omitted appearance props from treatment before rendering: legacy keeps surface/elevated/current text defaults; unified defaults to filled/flat/neutral-label/body text. Do not destructure `variant='surface'` before that resolution, or an opted-in caller that omits variant will receive the wrong material. One renderer and the existing event/ref/keyboard code remain in place; this prop selects appearance only. Add the target API below. Do not flip existing defaults or reinterpret all existing filled/ghost callers during this step. Cover this compatibility-default selection with a focused branching regression; do not merely snapshot color values.

```ts
type InputSurfaceRole = 'field' | 'composer';
type InputParentSurface = 'canvas' | 'muted';
// Extend the existing Props; retain TextInputProps and current supported props.
type InputTreatmentProps = {
  treatment?: 'legacy' | 'unified';
  onSurface?: InputParentSurface;
  surfaceRole?: InputSurfaceRole;
  footerElement?: ReactNode;
};
// Add 'plain' to the existing InputVariant union. It is transparent, with no
// perimeter or frame padding; unlike 'inline', it keeps paragraph sizing.
```

- [x] Implement `resolveInputAppearance` in `inputAppearance.ts` from the guide's material table. Keep it free of persistence/keyboard logic. Filled resolves to an input fill and no resting border/shadow; outlined resolves to an explicit contrast-checked outline; plain/inline resolve transparent. `onSurface` selects fill context; `surfaceRole` selects field/composer radius and spacing. `size="sm"` is explicit compact entry; standard entry uses body text. Inline typography/sizing remain adapter-owned. Write new shared numbers only in token/appearance ownership, never in a feature file.
- [x] Implement the internal `InputFrame` as the owner of material, input row and optional footer. Keep the label and helper/error outside. Put the focus/error indicator in a noninteractive absolute overlay so border changes cannot shift text; do not change padding on focus. Retain slots/icons/ref forwarding. A footer adds intrinsic height: the existing host's supplied viewport must bound editable text after subtracting non-text frame/footer space once. Do not add keyboard height. Coordinate this calculation with the current keyboard work before touching it; use a focused regression if logic changes.
- [x] Preserve the current accessible name/hint/error contracts. Distinguish disabled semantics from a read-only value; picker wrappers must not become dim or noninteractive merely because their inner text is non-editable. Add focused regression tests for preserved ref/native props, selection/value across focus and rerender, error association, and any newly introduced footer/viewport arithmetic. Keep the existing keyboard regression cases unchanged unless a separately accepted behavior change requires it.
- [x] Create stories showing both treatments during migration, white/muted parents, text/picker mixtures, long labels/content, focus/error/disabled/read-only, body/compact text, and composer tools. This is the material review surface, not another app/lab.
- [ ] Run `npm run typecheck --workspace @kwilt/tokens`, `npm run build --workspace @kwilt/tokens`, and `npm test -- --runInBand src/ui/Input.accessibility.test.tsx`. Use scoped local verification on the actual task files. Record new test results separately from rendered proof. Do not assert color/spacing constants with tests that mirror the implementation.

## Task 03: Converge shared compositions and adapters

**Files:** Create `src/ui/SearchField.tsx`, `SearchField.test.tsx`. Modify `src/ui/PickerFields.tsx`, `PickerFields.test.tsx`, `EditableField.tsx`, `EditableTextArea.tsx`, `NarrativeEditableTitle.tsx`, `LongTextField.tsx`, `Combobox.tsx`, `ObjectPicker.tsx`, `FilterDrawer.tsx`, `SortDrawer.tsx`, `SettingsSurface.tsx`, and `primitives.ts`. Exact starting sites are Task 02–03 in the ledger.

- [x] Add a ref-forwarding `SearchField` composition around `Input`. Required public contract:

```ts
export type SearchFieldProps = Omit<
  React.ComponentProps<typeof Input>,
  'value' | 'onChangeText' | 'multiline' | 'leadingIcon' | 'trailingIcon' |
  'onPressTrailingIcon' | 'variant' | 'clearButtonMode'
> & {
  value: string;
  onChangeText: (value: string) => void;
  accessibilityLabel: string;
  onClear?: () => void;
  clearAccessibilityLabel?: string;
};
```

- [x] Compose filled/flat `Input`, search icon, autocorrect off, capitalization none, and search return key. Use one owned clear button, expose it only for a nonempty enabled query, and preserve focus via the forwarded ref. Clearing emits `onChangeText('')` once and invokes optional `onClear` once for additional caller effects; remove old call-site query clearing from that optional callback to prevent duplication. `clearButtonMode="never"` prevents a second native clear. Do not add filtering/debounce inside this wrapper.
- [x] Add/run the following focused behavior tests before implementing clear behavior, then rerun to green:

```tsx
it('clears once without submitting the search', () => {
  const change = jest.fn();
  const submit = jest.fn();
  const clear = jest.fn();
  const { getByLabelText } = render(
    <SearchField accessibilityLabel="Search goals" value="walk"
      onChangeText={change} onSubmitEditing={submit} onClear={clear}
      clearAccessibilityLabel="Clear goal search" />
  );
  fireEvent.press(getByLabelText('Clear goal search'));
  expect(change).toHaveBeenCalledTimes(1);
  expect(change).toHaveBeenCalledWith('');
  expect(clear).toHaveBeenCalledTimes(1);
  expect(submit).not.toHaveBeenCalled();
});
```

- [ ] Thread the temporary treatment and parent-surface context through picker adapters. Reuse the internal frame/material instead of inheriting disabled `Input` opacity. Preserve the trigger as one named button, its chevron/current value, selected state and clear target. Test that an enabled picker remains enabled when displaying a non-editable value, and that clearing does not also open it. Migrate internal relation search to SearchField.
- [ ] Move existing editable/notes adapter appearances to shared material while retaining their draft/validation/commit/preview behavior. A rich editor and its auxiliary link/AI dialogs are separately inventoried. No JSX consumer of `EditableTextArea` was found in the first snapshot: trace exports/dynamic callers before deciding whether to remove it or retain it with a scoped reason. Never delete it on grep absence alone.
- [ ] Give adapter callers explicit opt-in; do not restyle all defaults at once. Each internal raw native control must consolidate into `Input` or obtain a narrow owned-adapter entry in policy. Export SearchField from `primitives.ts`; do not export the internal frame as a feature escape hatch.
- [ ] Run `npm test -- --runInBand src/ui/SearchField.test.tsx src/ui/PickerFields.test.tsx src/ui/Input.accessibility.test.tsx src/ui/FormField.test.tsx`, inspect the relevant existing Storybook stories, and complete the scoped local gate.

## Task 04: Prove the three representative native pilots

**Files:** `src/features/shared-home/SharedLifeComposer.tsx`, `SharedLifeConversation.tsx`, `SharedLifeComposer.test.tsx`; `src/capabilities/chores/components/ChoreEditorDrawer.tsx`, `ChoreEditorDrawer.test.tsx`; `src/features/search/GlobalSearchDrawer.tsx`; `src/features/goals/GoalsInventorySearchBar.tsx`; the category-search site only in `src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx`. Add `docs/design-system/evidence/input-unification/README.md` with capture references.

- [x] Opt ordinary Chore fields and picker triggers into unified filled material; preserve its compact row placement, recurrence and assignment. Opt Home writing/reply into `surfaceRole="composer"`; keep established Post/Send placement and audience context. Do not add tools solely because the reference image has them.
- [x] Replace the three search pilots with the new composition. Representative shape during migration:

```tsx
<SearchField
  treatment="unified"
  accessibilityLabel="Search goals"
  value={value}
  onChangeText={onChangeText}
  placeholder="Search goals"
  clearAccessibilityLabel="Clear goal search"
/>
```

- [ ] Run `npm test -- --runInBand src/features/shared-home/SharedLifeComposer.test.tsx src/capabilities/chores/components/ChoreEditorDrawer.test.tsx src/ui/SearchField.test.tsx`. Characterize reply send/draft preservation with focused coverage if its wrapper conversion changes event delivery; do not post fixture content to a real audience to obtain visual evidence.
- [ ] Claim the one approved runtime only when available. Record provenance, then enter Home share/reply, the Chore editor, Global Search, Goals search and Money category search through actual navigation. Capture empty/filled/focused/error/disabled cases; long text, smallest supported width, largest supported text, white/muted parent, normal/increased contrast; select and move the caret, switch fields, scroll a capped textarea and use existing completion controls with keyboard open.
- [ ] Check field identifiability at rest and text/control contrast; if soft fill alone is insufficient, refine shared cues/material or apply the documented contrast exception. Do not certify the pilot by checking only focus color. The active line and action must remain visible; first-tap controls must work without losing text. Verify iOS and Android where supported; record unavailable targets as unverified, never as a pass.
- [ ] Review the real rendered surfaces against the accepted direction and record the chosen shared token values and any context exceptions. Continue routine refinements under Andrew's existing authorization; do not ask to approve the same direction again. Only a materially different product behavior or design decision requires new user input.

## Task 05: Migrate ordinary forms across account, household, Plan and supporting flows

**Files:** All ledger Task 05 paths: account profile/auth/phone/destinations/admin/activity-area/notification files, `HouseholdSettingsScreen`, `ManagedChildDeviceHost`, onboarding, remaining Chores, Plan picker/search forms, Screen Time sentence picker, reporting, Home library/browser and DevTools. The coverage document lists every exact path and site (40 starting sites).

- [ ] For each site, perform the repeated slice protocol. Ordinary fields move to unified filled; searches to SearchField; picker fields use the corresponding owned trigger. Retain meaningful sentence-style and inline exceptions.
- [ ] Preserve input-sensitive contracts: email/password secure/autofill and submit, phone/code keyboard and normalization, child invitation flow, disabled billing/admin values, destructive/report draft handling, date representation and Plan selection behavior. Typed date inputs do not automatically become date pickers.
- [ ] Use this ordinary-field transformation at each applicable site, keeping the existing callback rather than inventing persistence:

```tsx
<Input
  treatment="unified"
  label="Email"
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
  autoCapitalize="none"
  autoCorrect={false}
/>
```

- [ ] Delete superseded appearance styles only after confirming no non-input consumer shares them. Keep host spacing and existing hidden/admin route guards. Record inaccessible admin/device routes as unverified until inspected or explicitly waived; they are not a reason to drop ledger rows.
- [ ] Run existing focused coverage such as `npm test -- --runInBand src/features/account/EmailPasswordSignInForm.test.tsx` and the related tests selected by the scoped local gate. Capture at least authentication, multi-field settings and a drawer form; check remaining changed sites at rest and their exceptional states. Close every Task 05 row with source and applicable behavior/native evidence.

## Task 06: Migrate food forms and repeating editors

**Files:** All Task 06 ledger paths under `src/capabilities/recipes/`, `groceries/`, `meal-planning/`, and `src/features/household-food/` (22 starting sites), including `RecipeEditScreen`'s local `Field`, ingredient/instruction rows, import, cook completion, GroceryItemEdit, store capture, occasion/reminder and trip-target controls.

- [ ] Inventory the runtime uses of local wrapper `Field`; its one native JSX site can render many fields. Replace its native control with `Input` and keep one label/error owner. Preserve every supplied native prop, controlled value and callback.
- [ ] Use filled ordinary fields for names/amounts/URLs; keep dense ingredient and instruction rows in the shared compact or deliberate inline composition. Do not use a 112pt paragraph minimum for each ingredient line. Remove custom borders/fills/radii after the replacement is in place.
- [ ] Preserve stable row identity/caret while typing, units/quantity parsing, add/remove rows, multiline instructions, recipe import mode switching, draft save, AI revisions and confirmation. Food or trip values must not acquire new Money semantics. Test row add/remove and saved data equivalence where the conversion risks those behaviors.
- [ ] Run `npm test -- --runInBand src/capabilities/recipes/screens/RecipeEditScreen.test.tsx` plus selected affected tests; render a long recipe with keyboard focused in a lower row, an import textarea, grocery edit and a compact capture sheet. Close all rows through the slice protocol and scoped local gate.

## Task 07: Migrate Money, Explore and Games with domain contracts intact

**Files:** All Task 07 ledger paths (19 starting sites), including Money create/detail/living-plan/split fields, Explore place search/name, Games identity/setup/join and connection-game responses. Category search was piloted in Task 04; do not count it twice.

- [ ] Read `docs/capabilities/money/README.md` and the behavior relevant to each amount/note before editing. Keep decimals, sign, formatting, unit presentation, clearing and validation stable. A filled amount field must not change an allocation or transaction write path.
- [ ] Replace Explore's custom input/search shells with owned controls while retaining the surrounding map/floating-control geometry. Verify map backdrop/readability, search focus, selection and place-name persistence. Restyling a field does not adopt a new floating map control.
- [ ] Replace Games paper-specific field styling with the shared treatment in ordinary setup/join contexts. Retain code length/grouping/case and player-name identity rules. Any deliberately themed in-game response treatment needs a exact scoped exception with contrast/interaction proof; a Games-wide exemption is not allowed.
- [ ] Run the selected Money/Explore behavior suites and `npm test -- --runInBand src/capabilities/games/features/remote/__tests__/JoinTableScreen.test.tsx`. Use safe fixture/local state for destructive/financial/remote actions. Render amount error/empty states, Explore search over its real map, and Games code entry. Close the rows and scoped local gate.

## Task 08: Migrate inline, rich notes, capture, replies and legacy AI surfaces

**Files:** Every Task 08 ledger path under activities, arcs, goals, chapters and `src/features/ai/AiChatScreen.tsx` (60 starting sites). Include `ActivityDraftDetailFields`, `ActivityDetailRefresh`, `QuickAddDock`, `CheckinComposer`, `GoalFeedSection`, pending check-in drafts and all six LongTextField consumer sites; see coverage for exact locations.

- [ ] Preserve native inline title/checklist geometry and completion policy. Use shared plain/inline material through existing adapters. Record empty-title restoration versus recoverable invalid paragraph handling explicitly; do not unify these into one blur rule.
- [ ] Move notes previews to the corresponding filled/plain presentation; keep the rich editor and auxiliary fields intact. Verify edits survive close/reopen with the existing persistence boundary. No HTML-to-plain-text conversion or new autosave policy.
- [ ] Replace ordinary local AI proposal fields and feedback fields with the owned controls; capture/composer surfaces use shared material while keeping their established collapsed/expanded and voice/attachment anatomy. QuickAdd keeps its measured growth, submit key and one-create behavior. Consolidate raw control code only where ref/selection/native event semantics remain equivalent; otherwise retain an exact adapter exception with a removal condition.
- [ ] Add a regression before any change that could duplicate a commit on submit+blur or lose the most recent native text. Existing focused starting commands:

```bash
npm test -- --runInBand src/features/activities/QuickAddDock.test.tsx src/features/activities/useQuickAddDockController.test.ts src/features/goals/GoalFeedSection.test.tsx
```

- [ ] Verify inline tap/edit/finish/cancel, a very long title/checklist item, rich formatting after reopen, capped check-in text, and QuickAdd keyboard submit. Trace whether legacy AI paths are reachable; remove only proven unused code and exports. An unreachable claim requires route/import evidence and successful build/checks. Close every site; preserve all meaningful modes.

## Task 09: Align the embedded web composer explicitly

**Files, site repository:** `components/unified-chat/KwiltChatWorkbench.tsx`, `KwiltChatWorkbench.module.css`, `components/ui/input.tsx`, `components/ui/textarea.tsx`, `app/globals.css`, `tailwind.config.ts`; create `lib/input-material-contract.json` and `lib/inputMaterialContract.test.ts` for token-mapping/boundary checks. **Native repository:** create `scripts/input-patterns/export-material-contract.mjs` and `packages/kwilt-tokens/generated/input-material-contract.json`. Native host reference: `src/features/unifiedChat/UnifiedChatScreen.tsx`.

- [ ] Read the site's current instructions and inventory its actual control consumers before editing either shared web primitive. Add workbench sites to the migration ledger, including draft editors and both resting/expanded composers. Determine all shared web consumers affected by CSS/primitive changes; avoid an incidental redesign of marketing/guest forms.
- [ ] Add dedicated `--kw-input-fill`, `--kw-input-fill-pressed`, `--kw-input-fill-on-muted` and composer-radius roles mapped from the chosen native contract. Keep the existing site `--kw-field-fill` roles used by buttons unchanged. The site has no token package dependency now: export a versioned, checked-in JSON material snapshot from the native package's built exports, copy the same snapshot into the site, and test each repo's material against its local snapshot. The snapshot records schema version, source revision and semantic values. Use `--check` mode on the native exporter to fail stale generated output; no runtime dependency is needed. A coordinated input-token change updates both snapshots and the site CSS in one reviewed release batch. Separate repo checks cannot prove that a remote companion checkout is current; record matching snapshot digests in the integration receipt.
- [ ] Make the workbench control treatment explicit so other web consumers remain stable until intentionally reviewed. For the composer, apply fill/radius to `.composer` and transparent/backgroundless text to `.composerInput`. Remove its resting outline/shadow within the workbench treatment; provide a real keyboard focus indicator. Preserve responsive/voice/live-state overrides by reading the complete CSS cascade, not just the first rule.
- [ ] Use web input/body typography and target sizes appropriate to its embedded mobile viewport. Ensure browser default/utility class precedence does not restore a border, shadow, or fixed textarea height over the component rules. Preserve draft/bridge messages and attachment/voice state; no new network side effects.
- [ ] Test the token-mapping boundary and unchanged shared non-input variables, not a screenshot-shaped DOM tree. Run in the site repository:

```bash
npx tsx --test lib/unifiedChatComposerLayout.test.ts lib/inputMaterialContract.test.ts
npx tsc --noEmit
npm run build
```

- [ ] After building native tokens, run `node scripts/input-patterns/export-material-contract.mjs --check` from the native checkout. Compare candidate snapshots with `cmp /Users/andrewwatanabe/Kwilt/packages/kwilt-tokens/generated/input-material-contract.json /Users/andrewwatanabe/kwilt-site/lib/input-material-contract.json`; expected exit 0. Record both repository revisions alongside this equality proof.

- [ ] Inspect resting, expanded, multiline, focus/error, attachments and supported voice/live states in the browser and in the actual native WebView host. Browser success does not prove the iOS keyboard bridge. Do not claim the hosted app changed without the required separate deployment authorization and evidence. Record local source/browser/native-host results separately from production.

## Task 10: Switch defaults only after caller coverage is complete

**Files:** `src/ui/Input.tsx`, `SearchField.tsx`, `PickerFields.tsx`, shared adapters, all remaining transitional call sites, input-pattern baseline and ledger.

- [ ] Run fresh complete discovery and join it against the ledger. Every current site must have a terminal disposition; every deletion has a verified reason. Ensure all ordinary fields explicitly select the new treatment or consume a migrated adapter. Audit default props and programmatic wrappers, not only literal JSX variants.
- [x] Set the public `Input` default to filled/flat/neutral-label/body text, and matching picker defaults to filled. Remove the `treatment` prop and its legacy rendering branch only after all callers and tests are migrated. Remove per-call migration props rather than leaving a redundant flag in every feature.
- [x] Remove new-code use of `surface`, `ghost`, and appearance overrides. Keep deprecated compatibility aliases only if a real consumer still needs them, with that consumer recorded; otherwise remove unused API branches. Do not change inline sizing while cleaning material names.
- [ ] Confirm non-input legacy token consumers retain their intended appearance. Fresh inventory must show no raw feature input construction or unregistered appearance override outside exact reviewed exceptions. Run the scanner's check and scoped local gate, then capture representative before/after default-switch surfaces to catch missed implicit consumers.

## Task 11: Make canonical adoption enforceable and discoverable

**Files:** `scripts/input-patterns/*`, `scripts/architecture-lint.mjs`, `package.json`, `AGENTS.md`, `docs/design-system/README.md`, `input-guidance.md`, `component-inventory.md`, `pattern-atlas.md`, `foundation-propagation.md`, input/editing/picker Storybook stories, and `docs/design-system/evidence/input-unification/README.md`.

- [ ] Remove completed migration debt from the baseline. Keep only exact owned native/rich/platform adapters with evidence, owner and review/removal condition. A newly styled field in a previously migrated file must fail. Test raw alias/namespace construction, local wrappers, style identifiers/spreads, duplicate clear mechanisms, deprecated variants, inappropriate elevation, stale exceptions, and fingerprint multiplicity.
- [x] Make `npm run architecture:lint` exercise the policy tests and CLI. Confirm the existing CI/`verify:changed` paths invoke the rule for affected input sources; add missing selection coverage without weakening the protected command or coverage. The permanent guard must not depend on a locally generated untracked report.
- [ ] Update Storybook titles/descriptions so Canonical Input is not described as a generic candidate. Record actual supported variants and prohibit feature-owned styling. Add compositions for standard form, mixed text/picker form, SearchField, composer, grouped metadata, inline title and rich preview; each documents scope and state proof.
- [ ] Update the existing Canonical Input/picker entries with the final treatment and evidence. Add SearchField as Canonical only after implementation/native evidence and the recorded owner decision support it. Preserve Candidate status for still-unproven grouped/editorial contexts. Do not mark whole capabilities accepted from one pilot.
- [ ] Record new authoring guidance, web propagation boundaries, and exact exceptions in the canonical docs. The AGENTS link added during planning is the discovery point; avoid copying the full contract into multiple files. Close the coverage ledger and add a receipt with source revisions, automated checks, runtime captures and remaining platform limitations.

## Task 12: Review and verify the actual integration candidate

- [ ] Review every changed source, ledger disposition, shared contract and exception against this plan. Confirm no persistence/keyboard behavior changed without a separate decision. Verify ref/native prop forwarding, no nested filled surfaces, no color/radius overrides, and no unsupported new control/publishing action. Use requesting-code-review/verification-before-completion workflows; no subagents are implicitly authorized.
- [ ] With a stable actual candidate, run `npm run verify:changed -- --run` in the native checkout. Retain the actual CI, typecheck, test and architecture results. A source edit during the run invalidates affected evidence. Run wider tests only when required by shared-boundary risk or the integration gate.
- [ ] Complete the native matrix: standard screen form, multi-field drawer, inline list/title, capped composer, rich editor, map/search, secure/code/amount field and embedded web host. Cover first tap, selection, long paste/deletion, field switch, keyboard frame changes, Dynamic Type, empty/error/disabled/read-only and retry/persistence where applicable. Use safe fixture accounts/actions; no unsolicited real post/message or financial mutation.
- [ ] List unsupported/unavailable target proof explicitly; do not mark an unobserved platform as accepted. If a required runtime is unavailable, keep that acceptance row open rather than declaring app-wide completion. No TestFlight/App Store/production claim follows from these checks.
- [ ] Provide final receipt: components/tokens changed, sites migrated/retained/removed, exact exceptions, native/browser/assistive proof, automation results, candidate provenance, and release work still required. Commit only the intended verified changes if proceeding within authorized implementation scope; merge, push and deployment remain separate actions.

## Plan acceptance cross-check

| Approved need | Implementation coverage |
| --- | --- |
| Clearly contrasting borderless filled family | 02, 04, 10 |
| Correct pattern for each input job | Guide; 03, 05–09 |
| Comprehensive existing-app coverage | 01; per-site ledger; 05–10 |
| No incidental non-input restyle | Token consumer inventory; 02, 09, 10 |
| Preserve keyboard, selection and persistence | Behavior records; 02–09; 12 |
| Future development uses owned patterns | AGENTS discovery; 01 no-new-debt; 11 permanent CI |
| Real canonical component treatment | Guide + existing Canonical Input; 02–04, 11 evidence-backed completion |
| Cross-runtime consistency | 09 and explicit native/web mapping |
| Honest completeness and release boundaries | Terminal ledger dispositions; 12 receipts |

## Execution record — September 10, 2026

Implementation started in the authorized normal checkout. **The initiative is not complete.** The bridge keeps existing Input defaults legacy; native pilot callers have not yet opted in.

- Discovery/policy: 204 native sites across93 files, plus5 web sites; all182 original IDs retained. 137 containing-component references are separate reachability evidence. Exact policy entries include188 legacy debt allowances and3 owned-adapter exceptions. Scanner/policy tests and architecture integration exist. Per-site behavior records remain open beyond the characterized shared boundary and12 pilot sites.
- Foundation: input-only token roles, internal appearance resolver/frame, composer/footer geometry and explicit compatibility bridge implemented. Legacy token consumers retained; ref/native callbacks, legacy viewport behavior and error association preserved by focused checks. Storybook examples added for white/muted parents, label/value/error/read-only/disabled/compact, picker and writing/form compositions. Rendered native review remains open.
- Adapters: SearchField and picker opt-in bridge implemented with focused behavior tests. Other inline/rich/adapters remain unmigrated. Relation search opts into SearchField only when its caller opts into unified treatment.
- Web workbench work proceeded independently while native ownership was held: five fields explicitly select shared treatment; material export/hash checks and17 focused tests pass; production build passes. Browser composer fixtures checked at393px and320px. Standalone site TypeScript still reports the unrelated publicRecipeEditorial.test.ts costTier error. Artifact/correction rendering and native-host proof remain open.
- Native dependency: the keyboard task owns the Simulator and is waiting for the Mac to be unlocked to restore its test draft. This task acknowledged the hold and has not navigated, reloaded, rebuilt or installed. Further Input and pilot edits are held to preserve that acceptance candidate. Continue once that ownership is released; do not treat the gate as passed.
- No commit, push, deployment, default flip or broad feature migration has occurred.

Detailed source/runtime boundaries and captures: [input evidence](../../design-system/evidence/input-unification/README.md). Keep all nonterminal ledger statuses visible through continuation.


### First completion-gate review

The first full scoped gate surfaced a regression in three Chore assertions: picker inner-value accessibility had changed for legacy callers. Fixed by retaining legacy traversal and putting the selected value on opted-in trigger buttons. A focused red regression now covers unified selected-value accessibility; the Chore and picker suites pass after correction. Final scoped verification remains required for the corrected candidate. No pilot migration or global default change was made to work around the failures.


Corrected source gate: Node22.23.2,1,233 suites /7,610 tests pass,2 skipped; app/test types and architecture pass. Final scanner-only review tightened root-alias resolution and legacy-wrapper reuse;18 Node tests pass,137 host references,204 native sites unchanged. See evidence for the separate tooling follow-up receipt. Native acceptance remains blocked by the acknowledged runtime hold, not by the shared-component tests.

Tooling follow-up gate passed in4.80 seconds; ledger/native AST multiset reconciles exactly. The temporary local web browser/server were closed. Resume at the native ownership dependency and remaining Task03 adapters; do not skip the Task04 pilot gate before broader migrations.

### Unlocked pilot update

Twelve Task04 fields and the Goals search host now opt into the shared family. The Goals adapter clears through `onChangeText` once; the host callback only collapses search and preserves sort. Chore tests now query the selected accessible trigger value. All53 focused tests pass. Baseline removed the migrated exact debt and retained a narrow reviewed Goals host exception; it also corrected the previously omitted second identical QuickAddDock branch already in ledger INP-196. No app caller was added for that correction.

Initial native Home writing, Chore and Global search checks passed the scenarios recorded in [evidence](../../design-system/evidence/input-unification/README.md). Money search is clipped under the status bar with keyboard open. Runtime was handed back to the keyboard task to repair that concrete host failure; Task04 and broader migration remain open. Goals reveal, Home reply/photo, Reward and the wider platform/accessibility matrix are not certified. The global Input default remains legacy.

### Shared composition follow-up

Money's category-search native clipping failure is repaired by the keyboard task and verified in its narrow resize-host receipt. The broader Task04 matrix remains open. Independent Task03 work now converges16 shared sites: EditableField, both Combobox searches, filter/sort controls, and grouped settings values. Existing commit, query, date, tag-capture and Apply semantics remain attached to their hosts. Native defaults and the shared keyboard/title files remain untouched. Two unused implementations (EditableTextArea/ObjectPicker) are removed after direct/export/dynamic-reference audits; three historical ledger rows remain for deletion verification. Storybook editing/picker checks and focused23 tests (22 composition plus motion-shim regression) pass; scoped completion is recorded in evidence when available.

The shared-composition completion gate passed (1237 suites /7617 tests, app/test types, code health and architecture). Unused component deletions are verified; their original ledger IDs remain. This does not complete the rich/inline adapter work, remaining168 native sites, full native matrix or global-default switch.

### Remaining native checks interrupted by lock

Filter drawer material rendered consistently, but its keyboard covers Apply/Cancel. The local test condition was canceled without applying it. Failure capture and host details are in the evidence receipt and were handed to the keyboard task. Goals reveal and Home reply/photo remain unverified: automation did not expose Goals search, and the Mac locked after opening the existing fictional Home preview. Simulator ownership was explicitly released back to the keyboard task. Task04 stays open; Tasks05–08 and the default switch remain held. This interruption does not invalidate the earlier scoped source-test receipts or establish acceptance for the unobserved cases.

### Home fixture acceptance and Filter repair follow-up

The keyboard task repaired FilterDrawer's footer with existing resize mode and the drawer-owned scroll view, then verified visible actions and first-tap Cancel without retaining a filter. Home reply now has direct native resting/long-text/final-caret/Return/first-tap Send evidence through the existing in-memory fixture repository. Optional photo description has native focus/Return evidence with a stock Simulator photo; the test photo was removed, draft restored empty, and Post never invoked. See the detailed evidence receipt for boundaries and captures. Goals reveal still cannot be operated reliably through automation; Reward, edit-post mode and the full accessibility/platform matrix remain open. Task04 is not closed, and the global-default and broad feature migration gates remain unchanged. Simulator ownership returned to the keyboard task with Goals inventory visible and no draft pending.

### Rich-notes composition and legacy-token classification

All90 legacy-token consumers are classified and freshly reconciled; token values remain unchanged. LongTextField gains explicit unified preview opt-in via an internal shared-material preview, and its two link-dialog controls now use Input. The inaccessible internal Custom refine dialog was removed after proving its visibility state never becomes true; its historical ID remains pending the completion gate. The owned Pell editor's formatting/autosave/Done and keyboard behavior are preserved. Six focused tests pass and the actual read-preview component rendered in Storybook; native rich-editor/link-dialog acceptance remains open. No broad feature caller or default switch occurred. The keyboard task retains Simulator/shared-host ownership.

Rich-notes completion gate passed in26.75s: app/test types, code health, architecture and5 suites/29 tests. INP-173 is now removed/verified; all209 historical IDs remain, with200 active native controls. NarrativeEditableTitle remains with the keyboard task, and the remaining caller waves and native acceptance matrix are unfinished. The source/doc slice is stable for the keyboard task's next scoped gate.

### Task05 staged account and Chore implementation

Fourteen ordinary form/query/choice sites now explicitly opt into the family: Chore review and reward rate, sign-in, profile, Phone Agent, destination-library search and notification cadence. The two notification triggers retain their custom grouped SettingsRow presentation. Destination queries use SearchField with a named clear action; a red/green test covers both inline and drawer branches without installation/navigation or drawer dismissal. Existing blur saves, explicit submits, date-picker ownership, secure/code keyboards and permissions remain unchanged.

This resumes source implementation in Task05 while Task04 acceptance remains open. The representative Home writing/reply/photo, Chore, Global search and repaired Money/Filter host evidence supports continued explicit opt-ins; it does not close Goals reveal, Reward, edit-post or the wider accessibility/platform matrix. The earlier broad-migration hold is relaxed for source work only. Every migrated row remains nonterminal awaiting native acceptance, and the default switch retains its full acceptance gate. Simulator/shared keyboard/title ownership remains with the keyboard task.

The ledger preserves all209 historical IDs:50 native implemented awaiting native,150 planned,4 removed/verified and5 web awaiting runtime. Fourteen exact old debt allowances were removed, and active identities/multiplicities match the fresh200-control/137-host AST snapshot. All58 focused tests pass; scoped completion is recorded separately in evidence.

A further11 ordinary form sites explicitly opt in: destination details, household entry, optional safety-report note and collection name. Handlers and hosts are unchanged. Destination verification commands expose a pre-existing alias issue: Textarea is Input without automatic multiline. INP-192 records that discrepancy and cannot reach terminal acceptance until the intended editing behavior is resolved and verified. Current counts:61 native implemented awaiting native,139 planned,4 removed/verified and5 web awaiting runtime.

### Task05 query, inline and sentence adapters

Eight additional sites converge: both Activity area editors, destination-library query, default/proposal calendar pickers, Plan slot search, Screen Time sentence picker and saved-moment search. Area rename uses plain material in its existing row; Add uses filled. Proposal Calendar retains its custom inline trigger. The sentence adapter uses one PickerFieldTrigger with selected-value accessibility; its narrow exception forwards audited placement styles only. Plan search uses canonical compact geometry rather than its old36-point local surface. Native rest/keyboard/Dynamic Type acceptance remains open for all eight.

Focused tests cover the sentence trigger's current-value announcement and single action (red before replacement), Plan query clear/filter continuity, and saved-moment clear issuing exactly one existing read query without a write. The saved-browser harness initially lacked a valid AppState subscription cleanup object; correcting the mock resolved that test-only failure without a production behavior change. Current ledger:69 native implemented awaiting native,131 planned,4 removed/verified and5 web awaiting runtime;200 active native controls and137 hosts still reconcile exactly. Eight old debt allowances were retired and one reviewed owned-adapter placement exception added. Scoped completion follows in the evidence receipt.

### Task05 specialized forms

Eight more source sites converge across admin detail/search, developer feedback, managed-device code and four onboarding controls. Admin keeps an exact owned-adapter exception for its existing empty-status-value/badge layout; route/authorization guards are unchanged. Device setup uses the contrasting muted-parent material and retains numeric normalization plus explicit Continue. Developer feedback now uses a named capped multiline Input, with existing per-chat AsyncStorage save and failure retention. Onboarding preserves refs, Return/Next/Done, caps and state transitions; custom answers use their question title as accessible name, and field margin belongs to the container.

Both focused suites/four tests pass, including managed-code formatting, incomplete-code disabling and explicit six-digit submission. No backend setup, invitation, feedback publication or admin action was invoked. Current ledger:77 native implemented awaiting native,123 planned,4 removed/verified and5 web awaiting runtime. Active controls/hosts remain200/137. All direct Task05 fields are source-migrated; its remaining planned INP-199 is the QuickAddDock composition shared with Task08. This does not close Task05 native acceptance or the recorded destination-command multiline issue.

### Task06 recipe editor and repeated rows

Four historical control sites now use shared Input: IngredientLineEditor, InstructionSectionEditor and RecipeEditScreen's AI draft plus seven-use Field adapter. Existing parent-owned row identity, callbacks, explicit Remove/Save and AI Apply-to-draft behavior remain. The shared field owns label and material once; yield widths/flex move to the container. Instruction and description/notes controls use capped multiline editing. Native long-text, keyboard and repeated-row acceptance remains open.

The original six RecipeEditScreen tests passed after migration. An additional behavior test verifies the second instruction keeps its stable id and complete multiline text when the first row is removed, without saving until Save is pressed. Scoped completion follows. Exactly four legacy debt entries are removed, with one reviewed Field prop-forwarding exception. The ledger has81 native awaiting native,119 planned,4 removed/verified and5 web awaiting runtime; all209 IDs and200 active controls/137 host references reconcile. Three obsolete legacy fieldFill consumers were removed from these exact files; the remaining87 references in46 consumer files match fresh source, with the token definition excluded and unchanged.

### Task06 cooking and meal feedback

Four additional controls migrate: used-instead value, substitution note, cooking note and optional meal hard-pass explanation. The fields keep their existing local state and explicit Done/Save actions. Cooking notes default to private; choosing a recipe-edit proposal retains the existing review step, with no automatic editing/publication. Hard-pass text keeps its140-character limit and trimmed Other-reason payload. Existing rating and card surfaces remain unchanged, including their legitimate legacy selection fill.

Current ledger:85 native implemented awaiting native,115 planned,4 removed/verified and5 web awaiting runtime. Four exact debt allowances were retired; all209 historical rows and200 active controls/137 hosts still reconcile. Native keyboard, long-text and surface-state acceptance remains open. Scoped verification follows in evidence.

### Task06 grocery, occasion and reminder forms

Five historical control sites now use Input: six store-opportunity fields, three grocery-edit fields, occasion date, reminder clock and trip target. Labels and material are owned once, while parent draft callbacks, decimal/time/date interpretation, explicit save/review actions and existing hosts remain. The grocery adapter has one exact reviewed prop-forwarding exception. No Money semantics, reminder, grocery update or real store opportunity was created during implementation.

Focused coverage passes across the four existing component suites. An overly broad style cleanup initially removed the reminder-builder parameter type; the focused test exposed it. The original signature was restored and only the obsolete style was removed. A direct source comparison verifies the complete reminder builder and scheduling functions are identical to HEAD; all three reminder tests pass. Scoped completion follows in evidence.

Current ledger:90 native awaiting native,110 planned,4 removed/verified and5 web awaiting runtime. Five exact debt allowances retired; all209 historical IDs and200-control/137-host identities reconcile. Three obsolete fieldFill input consumers were removed; the remaining84 references in45 consumer files match current source. Native keyboard, decimal/time/date and multi-field drawer acceptance remains open.

### Task06 remaining food controls

Nine remaining sites migrate: store search, meal suggestion, four plan-editor fields, URL/text recipe import, coverage name and custom food need. Search clears through the owned composition without performing retailer actions. Recipe import retains its mode-specific native props and explicit extraction/review flow; text mode uses a180-220 viewport. Plan count/date validation, local meal-note Add, food-need Return/Add and outer save actions remain unchanged. The sole coverage-name appearance style is removed after reference audit.

Three focused suites/28 tests pass, including a new assertion that clearing store search does not search, select a store or add to a cart. Current ledger:99 native implemented awaiting native,101 planned,4 removed/verified and5 web awaiting runtime. All Task06 sites are now source-migrated, while its native acceptance remains open. Nine exact debt allowances retired; all209 historical IDs and200 active controls/137 hosts reconcile. Four more obsolete input token consumers were removed;80 remaining references in44 consumer files match fresh source. Scoped completion follows in evidence.

### Task07 Money fields

Twelve remaining Money Input callers explicitly opt into unified material; four category SettingsTextInputRow callers are reviewed against their already-unified plain grouped adapter. The grouped presentation stays intact. Source review preserves category currency parsing, optional forecast money/day/month validation, allocation-plan validation, coverage rounding/clamping, note caps, saving locks and explicit review/save actions. Monthly category blur remains a preview, not a write. The previously repaired category-search host is unchanged by this slice.

A red/green scanner regression now recognizes SettingsTextInputRow as the owned canonical adapter while still rejecting caller appearance overrides. All19 scanner/policy tests pass. Four focused Money suites/33 tests pass. Exactly16 obsolete debt allowances are retired; all209 historical rows and200 active native controls/137 host references reconcile. Current ledger:115 native implemented awaiting native,85 planned,4 removed/verified and5 web awaiting runtime. No actual transaction, allocation, category, merchant rule or Money plan mutation was performed. Native amount error/empty/keyboard and full acceptance remain open; scoped completion follows in evidence.

### Task07 Games and Explore

Seven remaining Task07 sites migrate. Games names/code/answer use canonical fields while max lengths, ref forwarding, code normalization, submit guards, seat identity and explicit game actions remain. Setup's existing Remove button moves into Input's trailing slot, avoiding a nested field enclosure. Common Thread keeps its80-character local answer and explicit reveal/next flow. Its obsolete shared input/multiline styles were removed after reference audit. A replacement initially malformed the join name-ref type; focused tests caught the parse error and the original TextInput ref annotation was restored before passing tests.

Explore now uses SearchField for visited Places and Input for naming. The custom outer search box/icon and obsolete field styles are removed; nearby recommendations, map geometry, result-selection behavior and place persistence handlers remain unchanged. The expanded test confirms clear restores visited results without moving the map. Games focused tests pass20 cases and Explore passes39; a further seat-removal action regression is included in scoped verification.

All Task07 controls are source-migrated. Current ledger:122 native implemented awaiting native,78 planned,4 removed/verified and5 web awaiting runtime. Seven exact debt entries retired, all209 historical IDs retained,200 controls/137 hosts reconcile. Two obsolete Explore fieldFill uses removed;78 remaining token references in43 consumer files reconcile with source. Native Games keyboard/theme contrast and Explore map/drawer acceptance remain open. No real remote game, place visit, sharing or financial action was performed.

### Task08 rich-note callers and creation fields

All six LongTextField feature callers now explicitly select unified treatment. Activity detail/draft/peek and Arc/Goal creation use filled previews; Goal detail retains its documented flat/plain editorial presentation beside narrative content. Autosave900ms/zero-debounce behavior, local versus persisted draft ownership, disabled peek, AI callbacks, editor snap points and empty-value normalization remain unchanged. No shared editor, title or keyboard implementation was edited.

The scanner now requires explicit unified treatment for LongTextField callers during migration. Its new alias regression failed before the rule and passes afterward; all20 input-tooling tests pass. Existing rich-note material/behavior suites pass6 tests. Five additional creation fields converge: view name, Arc custom answers, Goal prompt/timeframe and invitation email. Question-title/recipient names are explicit, and Arc spacing belongs to the field container. Existing Goal/share suites pass8 tests; no goal, Arc, view or invitation was created or sent during verification.

Current ledger:133 native implemented awaiting native,67 planned,4 removed/verified and5 web awaiting runtime. Five exact creation-field debt entries retired; the six rich callers had no baseline allowances, so enforcement was strengthened rather than adding exceptions. All209 historical IDs and200 active controls/137 hosts reconcile. Native rich-editor/caller, plain Goal context, disabled peek and creation-flow acceptance remain open. Scoped completion follows in evidence.

The rich-note/creation scope passed local automation in29.97s (`/tmp/kwilt-rich-creation-local.log`): application types, architecture, code health, whitespace,6 Jest suites/34 tests and script tests. No native runtime or invitation/persistence action was performed. Native acceptance and integration remain open.

### Task08 Activity and Goal standard pickers

Ten default picker callers now opt into unified filled treatment: Activity status/area/type, draft difficulty/area/type, AI Goal proposal Arc, Goal detail Arc/priority, and Goal creation Arc. Required selections retain their fallbacks; optional relations retain null normalization and clear behavior. Draft versus persisted callbacks, timestamps, disabled empty-Arc state, compact sizing and outer confirmation actions remain unchanged. Custom row triggers remain separately planned.

Current ledger:143 native implemented awaiting native,57 planned,4 removed/verified and5 web awaiting runtime. Ten exact legacy allowances retired; all209 historical IDs and200 active controls/137 hosts reconcile. Direct input policy passes337 sites. Scoped local verification passed36.41s (`/tmp/kwilt-pickers-local.log`): app/test types, architecture, code health, whitespace and2 suites/10 tests. The scope omitted292 other changed files and does not approve that work. Architecture retained10 warnings; no gate errors or stale marker. Native selection/clear, keyboard search and accessibility acceptance remain open. No Simulator, real Goal/Activity change or shared keyboard/title implementation was performed.

### Check-in, tag search and remaining textarea callers

Six sites migrate: tag search, check-in composer, check-in reply, pending draft editor, AI identity context and AI view customization. SearchField owns query clear/refocus while tag application remains separate. Check-ins use named canonical inputs with existing character limits and explicit Send; the compact composer no longer has a duplicate outer border, and its error uses shared field anatomy. Pending editing uses the contrasting fill on its muted card. Identity retains blur/back profile commit and empty-to-undefined normalization; AI customization retains its explicit Apply callback, loading lock and88-140 multiline range. Identity and check-in multiline editors have bounded180-point maximums. No service/persistence action was executed against a real account.

Acceptance review found a pre-existing pending-draft bug: Done displayed the original draft and a later Send discarded local edits. A failing regression reproduced it. Done/reopening now retain local text for explicit Send; parent draft id/text changes refresh local text. Two behavior tests cover edit retention and parent-draft replacement. This is a local editor correction, not a new save-on-Done behavior.

Current ledger:149 native implemented awaiting native,51 planned,4 removed/verified and5 web awaiting runtime. Six exact legacy allowances retired; all209 historical IDs and200 active controls/137 hosts reconcile. Direct input policy passes337 sites. Check-in/search scope passed35.89s (2 suites/2 tests, app/test types, architecture and code health; `/tmp/kwilt-checkin-local.log`,298 unrelated changed files omitted). Textarea scope passed24.68s (2 suites/2 tests, app types, architecture and code health; `/tmp/kwilt-final-textareas-local.log`,303 omitted). Final pending-draft correction passed27.46s (1 suite/2 tests, app/test types, architecture and code health; `/tmp/kwilt-pending-edit-local.log`,305 omitted). All three processes exited0, with10 retained architecture warnings and no stale marker. Whitespace passes. Native long text, compact/expanded contexts, accessibility and keyboard acceptance remain open. No Simulator/shared keyboard/title operation or integration/publication occurred.

### Chapter notes, inline view creation and reviewed adapter callers

Four controls migrate: inline AI view description, banner image search and Chapter personal/feedback notes. Inline view creation moves its sparkles and existing create/loading action into shared Input, removing the custom bordered enclosure; Go, ref/autofocus, trimmed callback and busy edit lock remain. Banner SearchField owns clear/refocus while existing Return/Search retains remote query behavior. Chapter editors retain personal-note Save/Cancel, feedback optional-save semantics, limits, ref and busy state; shared bounded multiline material replaces local styles. No Chapter service handler was changed.

Scoped local automation passed38.01s (`/tmp/kwilt-chapter-view-local.log`): app/test types, architecture, code health, whitespace and4 suites/19 tests, including an explicit-create regression. The scope omitted306 other changed files;10 existing architecture warnings remain. No stale marker or gate error. Four exact debt allowances retired. One obsolete inline-view fieldFill consumer removed; remaining77 references in42 files exactly match current source by file/token multiplicity.

Four already-canonical callers were separately reviewed: Activities layout/group FormFields retain segmented choice anatomy, and Arc/Goal creation titles retain EditableField's validation and local draft commits. They require no redundant opt-in or styling. Their source ASTs have zero override violations;2 shared-adapter suites/5 tests pass (`/tmp/kwilt-adapter-callers-focused.log`) covering changed-value commit once, rejected empty values, label/error and disabled semantics. No baseline allowances existed for these four callers.

Current ledger:157 native implemented awaiting native,43 planned,4 removed/verified and5 web awaiting runtime. All209 historical IDs remain;200 controls/137 hosts reconcile. Native Chapter long text, view/banner search keyboard, segmented controls and creation-title context acceptance remain open. No Simulator/shared keyboard/title implementation, remote image search, actual view creation or Chapter publication occurred.

### Reviewed store-finder export and obsolete Arc/Goal editors

The two store-finder callers now resolve as canonical composed inputs through an exact module/export registry. The existing SearchField, query callbacks, current-location behavior, explicit store choose and separate preferred-store action remain unchanged. Scanner regression covers aliases, rejects material overrides and a same-named unrelated wrapper, and still discovers raw controls inside the reviewed implementation. The fixture initially used a non-forwarding shape; it was corrected to the actual destructured-query pattern before passing19 scanner/policy tests. Two exact legacy-wrapper allowances retired. Scoped gate passed10.36s (`/tmp/kwilt-store-adapter-local.log`): app types, code health,2 suites/23 tests and script tests;310 other changed files omitted.

Removed two unreachable module-local implementations: ArcNarrativeEditorSheet and ArcSelectorModal. Whole-source references showed definitions only, with no caller/export or dynamic lookup. Their two historical control IDs remain removed-verified-unused. Removed the unused Arc editor state/imports and exclusive styles. The active GoalActivityComposerModal remains and now uses two canonical labeled fields, preserving open reset, title nonempty gate, type choice, optional note normalization and explicit Add. Its multiline note is capped120-180. Four exact legacy entries retired for these deletions/migrations.

The first automated check caught a duplicate Input import introduced in this slice; it was removed. Inventory reconciliation also detected a concurrent LongTextField list/link CSS update. The four CSS rules were reviewed, its already-updated owned-rich-editor exception was preserved, and INP-170's fingerprint was refreshed without changing that implementation or adopting a new native claim. The corrected final gate passed25.68s (`/tmp/kwilt-old-editors-final-local.log`): app types, architecture, code health, whitespace and5 suites/29 tests, process exit0 with no stale marker. Existing10 architecture warnings remain. The prior failed candidate is superseded, not counted as a pass.

Current ledger:161 native implemented awaiting native,37 planned,6 removed/verified and5 web awaiting runtime. All209 historical IDs retained;198 active native controls/137 hosts reconcile. Direct policy passes335 sites. Legacy material inventory still exactly matches77 references in42 files. Native Add To-do, store finder, broader editor acceptance, final default switch and integration remain open. No Simulator/title/keyboard source action, actual store change, Goal/To-do creation or publication occurred in this slice.

### Activity steps and custom relation rows

Six sites migrated: four existing/new Activity and draft step editors now explicitly use unified plain treatment and accessible names, with shared body typography replacing redundant local text/padding overrides. The detail step retains a single exact reviewed exception for completion color/strike-through; its parent style contains only those two semantic properties. Multiline expansion, existing viewport clamp, no nested scroll, single-line draft add, ref/testID, focus/blur and continue/exit commit callbacks remain unchanged. Removed now-unused step/new-step styles after reference audit. The linked-Goal and difficulty custom rows retain their navigation/choice composition while explicitly opting into canonical picker ownership; Goal relation search uses the shared material.

Scoped local automation passed40.71s (`/tmp/kwilt-step-inputs-local.log`): app/test types, architecture, code health, whitespace and11 suites/86 tests, including existing step-completion and picker coverage. Process exited0 without stale marker;10 existing architecture warnings remain. Six exact legacy allowances retired and one precise completion-text exception added. Current ledger:167 native implemented awaiting native,31 planned,6 removed/verified and5 web awaiting runtime. All209 historical IDs and198 active native controls/137 hosts reconcile; direct policy passes335 sites. Native long-step expansion, keyboard and custom-row acceptance remain open. No Simulator, title/keyboard implementation or actual Activity/Goal mutation occurred.

### AI Arc proposal fields

Three proposal fields now use canonical filled Input: Arc name, narrative and optional feedback note. Each has an accessible name; feedback label/material are owned once. Narrative and feedback retain their three-line minimum and use a180-point maximum. Existing local draft setters, Adopt Arc trim/fallback flow, Not now/reset, Save feedback payload and Cancel remain unchanged. Obsolete local typography/border/padding styles removed. Diff review caught an over-broad placeholder cleanup affecting a separate suggestion input; that input was restored before exact identity reconciliation and verification.

Scoped gate passed28.14s (`/tmp/kwilt-ai-proposal-local.log`): app types, architecture, code health, whitespace and1 related navigation suite/3 tests. This is source/static evidence, not an AI proposal interaction test. Process exited0 without a stale marker;10 existing architecture warnings remain. Three exact legacy entries retired; all209 historical IDs and198 active native controls/137 hosts reconcile. Current ledger:170 native implemented awaiting native,28 planned,6 removed/verified and5 web awaiting runtime. Native proposal editing, keyboard/long-text and explicit adoption/feedback acceptance remain open. No AI request, Arc adoption, feedback submission, Simulator or shared keyboard/title action occurred.

### Activity location trigger

The location Combobox now uses canonical PickerFieldTrigger for its selected preview, pin icon and clear action. Existing controlled query/search, result/current-location selection, preview/map movement, platform presentation, portal, radius and outer Save/Cancel remain. PickerFieldTrigger adds optional clearAccessibilityLabel with the unchanged Remove selection default; this caller retains Clear location. A regression failed before implementation and passes afterward, verifying the named clear callback and stopped propagation without opening the picker.

INP-092 is migrated; new explicit composition site INP-205 is appended without renumbering historical controls. Current accounting:210 historical rows,172 native implemented awaiting native,27 planned,6 removed/verified and5 web awaiting runtime. All199 active native controls/137 hosts reconcile, and policy passes336 sites. One obsolete location fill removed;76 remaining legacy references in41 files exactly match source. Scoped gate passed85.92s (`/tmp/kwilt-location-trigger-local.log`): app/test types, architecture, code health, whitespace and95 suites/620 tests. Process exited0 without stale marker. Native location/map/keyboard acceptance and integration remain open; no actual location persistence or Simulator operation occurred.

### Verification-command multiline acceptance correction

INP-192 used the Textarea alias without enabling multiline, despite promising one command per line. A failing rendered-field regression established that it rendered single-line. It now explicitly enables multiline88-180 and disables automatic capitalization/correction; existing command splitting, trimming, blank removal,20-command limit and explicit Install/Save persistence remain. The regression also verifies a two-line payload is saved as two separate commands only after Install, with no write on blur. Fixture corrections stabilized navigation and enabled the simulated Pro path; the initial failed fixture gate is superseded by the final candidate.

Final scoped automation passed25.97s (`/tmp/kwilt-command-lines-final-local.log`): app/test types, architecture, code health, whitespace and1 suite/1 behavior test. Process exited0 without stale marker;10 existing architecture warnings remain. No actual destination, subscription or command execution occurred. Counts remain172 native awaiting native,27 planned,6 removed/verified and5 web awaiting runtime across210 historical IDs;199 active controls/137 hosts reconcile. Native command-entry keyboard acceptance remains open.

The tag-entry audit confirms that INP-080/089 need one owned chip-and-text composition. Merely replacing their raw input would retain feature-local field fill, radius and padding. The next implementation must preserve wrapped chips, detail empty-state width, AI-autofill clearance, measured host/ref and focus behavior, comma/Done/blur commit semantics, and Backspace/removal semantics while moving material and the plain inner Input into a shared UI adapter. These sites remain planned; no partial migration is claimed.

### Shared tag-entry composition

Added Candidate TagEntryField: shared appearance resolver/InputFrame owns one filled chip surface and focus indicator, with one plain Input and removable chips inside. Native input callbacks and ref forward through the adapter; parsing and persistence stay in Activity callers. Both detail/draft tag entries now use it. Exact comparison verifies all prior native semantic props/callbacks, excluding replaced appearance props, are unchanged. Detail keeps its measured outer host, suggestion guard, Backspace removal, focus/reveal callbacks, test IDs and AI-autofill clearance. The AI-autofill block is preserved verbatim. Draft empty-space press now focuses its field. Chip removal stops propagation before calling its owner. Two tests cover native callback forwarding and isolated chip removal.

An initial typecheck exposed read-only ActivityPeekFields consumers of the shared tag styles. Those preview styles were restored, preserving the read-only surface. Their legacy token row now explicitly records content-preview use; editable tag copies no longer own field material. One precise internal native-prop forwarding exception was added; two legacy raw-input allowances were removed. Public TagEntryField props omit style/material and multiline overrides. Added its barrel export, Candidate inventory/guidance and a Forms/Editing/TagEntry Storybook specimen; no visual/native promotion is claimed.

Final scoped gate passed83.98s (`/tmp/kwilt-tags-final-local.log`): app/test types, architecture, code health, whitespace,92 suites/607 tests and script tests. Process exited0 without stale marker;308 other changed files were omitted and existing architecture warnings remain. Current ledger:211 historical rows,175 native implemented awaiting native,25 planned,6 removed/verified and5 web awaiting runtime. All200 native controls/137 hosts reconcile; policy passes337 sites. Legacy inventory exactly matches75 references in41 files, including the retained read-only preview. Native chip wrapping, tap targets, keyboard/caret, AI badge clearance, accessibility and Storybook visual review remain open. No Simulator, shared title/keyboard change, tag persistence or AI request occurred.

### AI target-date trigger and internal adapters

AI Goal proposals now use PickerFieldTrigger for the target date, replacing a custom Pressable/read-only Input and opacity override. Existing displayed date, inactive disabled state and native-picker toggle remain, with shared selected-value accessibility and no clear action. No date parsing or persistence changed. The remaining internal picker legacy branches are intentionally retained for Task10's default-switch gate.

The scanner now recognizes exact private module/name pairs for FilterDrawer ValueInput and PickerFields FixedSetPickerField, while still scanning their internals. A red/green regression covers both adapters and confirms unresolved forwarding remains visible. The filter dispatch already selects canonical fields; enum/small-set wrappers retain typed SinglePickerProps forwarding. Four exact legacy allowances retired; the two fixed-set forwarding sites receive precise owned-adapter exceptions, with public unified opt-in still enforced. No blanket module exclusion was introduced.

Final scoped gate passed52.52s (`/tmp/kwilt-internal-adapters-final-local.log`): app/test types, architecture, code health, whitespace,3 suites/14 tests and script tests. Direct scanner/policy tests pass20 cases. Process exited0 without stale marker;314 other changed files were omitted. The first command had selected a nonexistent .tsx test path and did not run checks; the corrected .ts path is included in the final gate. Current ledger:179 native implemented awaiting native,21 planned,6 removed/verified and5 web awaiting runtime, across211 historical IDs. All200 native controls/137 hosts reconcile; compatibility defaults and native/integration acceptance remain open. No actual Goal/date mutation or Simulator operation occurred.


### Regular AI chat composer

INP-105 now uses shared unified Input with composer material and a footer for feature-owned Expand and Send. The old feature border, shadow and placeholder typography are removed. Native ref/test ID, controlled draft, content-size expansion threshold, explicit Return/Send handler and sending/empty guards remain. Both footer actions now have44-point targets. The measured outer composer fence remains; the expanded editor is still INP-106 planned so its full-pane geometry can be preserved deliberately. Native acceptance must cover empty-surface focus, long text/caret, first-tap Send, expansion continuity and keyboard-open message clearance. No AI message was sent.

Scoped gate passed26.80s (`/tmp/kwilt-chat-composer-local.log`): app/test types, architecture, code health, whitespace and3 suites/15 tests; script checks passed31 cases. Focused shared-input/draft-storage tests passed12 cases. These are shared contracts and draft tests, not live chat interaction proof.317 other changed files are outside the gate;10 existing architecture warnings remain. No stale marker; process exited0. Current accounting:180 native implemented awaiting native,20 planned,6 removed/verified and5 web awaiting runtime across211 historical IDs. All200 active controls/137 hosts reconcile; one exact legacy allowance retired. Default-switch, remaining migrations and native/integration acceptance are still open. No Simulator or shared keyboard/title implementation changed.


### AI inline fields and rendered tag-entry refinement

INP-097/098/101 now explicitly use unified Input. Goal title retains titleMd and its existing hidden line-measurement/controlled draft behavior; Goal description uses plain small Input with the existing three-line minimum/220 maximum. The suggested To-do title retains its15pt semibold display role, native ref and Done/blur editing exit; Input owns platform metrics and material. Three legacy allowances retired. Two exact semantic typography exceptions preserve heading/item hierarchy, with no general feature styling exemption. Proposal confirmation and selection/create callbacks are unchanged. An intermediate review caught bodySm's14pt default;15pt was restored before final verification.

The real TagEntry Storybook specimen exposed long-chip overflow at393 points. A saved rendered regression check failed for overflow and undersized removal targets, then caught a shrinking close icon at320 points. The adapter now constrains chip width, wraps its label, reserves44-point targets and keeps the icon14 points. Red/green checks pass at320 and393 after fonts load. Browser interaction added Weekend via Enter and removed only that chip, restoring the original specimen; disabled controls expose disabled semantics. Captures: `storybook-tags-320.png` and `storybook-tags-393.png` in the input-unification evidence directory. Reproduce with Storybook Forms/Editing/TagEntry and `npx agent-browser --session kwilt-input-storybook eval --stdin < docs/design-system/evidence/input-unification/tag-entry-layout-check.js`. This is rendered web-composition proof, not native keyboard/accessibility acceptance. The dedicated browser and port6006 server were closed.

Final scoped gate passed69.83s (`/tmp/kwilt-ai-tags-final-local.log`), process exit0, not stale:95 suites/620 tests, app/test types, architecture, code health and whitespace.317 other changed files are outside scope;10 existing architecture warnings remain. A preceding run was marked stale after inputs changed and is superseded. Current ledger:183 native implemented awaiting native,17 planned,6 removed/verified and5 web awaiting runtime across211 historical IDs. All200 native controls/137 hosts reconcile. Remaining title/quick-add, expanded-editor, legacy-default, native and integration work remains open. No Simulator/shared title or keyboard implementation changed; no proposal was adopted or actual AI message sent.


### Expanded AI chat editor

INP-106 now renders shared unified plain Input inside the existing EditorSurface body. The host body reports its available height through onLayout; equal multiline minimum/maximum values let the input fill that space and scroll internally. No new keyboard-height offset, shared keyboard/title edit or EditorSurface change was introduced. The same controlled draft, ref, autofocus, Return-send handler and header Close/Send guards remain. Removed the redundant feature font/color/flex text style. A focused test confirms a long draft and native editor instance survive host shrink180/expand500 with the expected shared-input height, without a second content-size event. This proves the shared resize contract, not native caret behavior.

Final scoped local gate passed26.88s (`/tmp/kwilt-expanded-local.log`), process exit0 and not stale:3 suites/16 tests, app/test types, architecture, code health and whitespace; direct input policy passes337 sites. Current ledger:184 native implemented awaiting native,16 planned,6 removed/verified and5 web awaiting runtime across211 historical IDs. All200 controls/137 hosts reconcile; one exact raw-input allowance retired. Native expanded-editor caret/scroll, close-reopen draft continuity and first-tap Send remain open. No Simulator or actual message send occurred. QuickAdd still requires its own composition review; its checkbox, measured text growth and action row cannot be silently flattened into a generic field.


### QuickAdd adapter and all seven callers

INP-095 now uses unified plain Input within QuickAdd's established single white drawer surface. The existing test explicitly requires that surface treatment; the visual migration does not add a second filled box inside it. Checkbox, AI/action row, measured22-96 text growth, scroll threshold, focus/blur guard, empty Done collapse and one-create behavior remain. Matching min/max values retain the host-owned height; exact15pt semibold/22-line-height typography is the only retained input-style exception. UnderKeyboardDrawer/EditorSurface code and positioning were not changed. Native caret and first-tap action acceptance remain open.

Audited all seven callers without editing their callbacks: Chores opens an enriched local draft before separate commit; Groceries owns async add success/failure and dismissAfterSubmit false; Activities retains its controller/filter/receipt behavior; both Goal placements retain goal scope, order, chat and location actions; Plan recommendations and slot capture retain their forwarded quick-add models and separate scheduling decisions. INP-183/184/193/195/196/198/199 now record those boundaries. Duplicate Goal identities retain both census rows. The scanner recognizes only the exact owned QuickAdd module/name and continues to audit its internal Input; a red/green regression proves this. Eight legacy allowances retired and one precise semantic typography exception added.

Final scoped gate passed31.73s (`/tmp/kwilt-quick-add-local.log`), exit0 and not stale:9 suites/137 tests, app/test types, architecture, code health, whitespace and script tests. Focused QuickAdd/controller41 tests include submit-once/blur, empty submission, capability anatomy and measured drawer height. Direct scanner/policy21 tests pass.319 other changed files are outside scope;10 existing architecture warnings remain. Current accounting:192 native implemented awaiting native,8 planned,6 removed/verified and5 web awaiting runtime across211 historical IDs. All200 controls/137 hosts reconcile. No actual create/enrichment action, Simulator operation or shared title/keyboard implementation edit occurred. Native acceptance/default cleanup and integration remain open.


### Editorial title caller audit and remaining gates

INP-074/109/113 retain the existing shared NarrativeEditableTitle adapter with exact heading/host-spacing exceptions; no runtime source changed. Audited To-do titleLg/bold, centered Arc titleLg/display lineHeight46 and centered Goal titleLg roles, plus their existing trim/update/edit-state/validation callbacks. Three legacy allowances became reviewed editorial exceptions. The internal native title renderer INP-174 and controlled draft title INP-084 remain planned; this audit does not close their keyboard/caret work.

Scoped gate /tmp/kwilt-title-audit-local.log passed25.03s, exit0, not stale:1 suite/5 shared-title behavior tests, app/test types, architecture, code health and whitespace. Current census195 native source dispositions awaiting native,5 planned,6 removed/verified and5 web awaiting runtime;200 controls/137 hosts reconcile. See docs/design-explorations/input-unification/completion-gates.md for the exact remaining sites, ownership handoff and native/default/enforcement/integration gates. No Simulator or shared title/keyboard implementation edit occurred.


### Permanent PR input-guard selection

Read-only CI tracing found that push CI ran architecture lint, but the protected PR selector omitted input-policy/baseline-only changes and native code outside features/ui. Added eight failing regressions for scanner, baseline, capability screen, other src component, theme, package UI, token and package.json changes. The selector now runs architecture lint across its src/packages discovery roots, input-pattern scripts and package metadata. This only adds the gate. Five protected fixtures were updated after asserting every other command/manual item/note remained exactly unchanged; no existing gate was removed or replaced. verify-changed imports this selector, and PR CI invokes verify-changed.

All76 verification-tooling tests pass. Final scoped gate /tmp/kwilt-input-ci-local.log passed6.12s, exit0, not stale: code health, whitespace and76 verification tests; no related Jest tests exist for the JSON fixture, so that step exited0 without test execution. This is local selector/integration-path evidence, not a hosted CI run. Source census remains195 native source dispositions awaiting native,5 planned,6 removed and5 web awaiting runtime. Shared title/Simulator ownership handoff still awaits Andrew's answer; no dependent source/runtime action occurred.


### Duplicate-clear guard

Added a red/green scanner regression for simultaneous native clear modes (always,while-editing,unless-editing) and a custom close action, including aliased Input imports and resolved prop spreads. The policy now reports duplicate-clear-controls for that explicit conflicting configuration. Negative cases preserve a native-only clear, custom-only clear, disabled native clear, a decorative close without a handler, and a distinct password-visibility action. Unknown prop spreads retain their existing review guard; no blanket allowance was added.

All23 scanner/policy tests pass. Scoped gate /tmp/kwilt-clear-policy-local.log passed18.44s, exit0 and not stale: architecture lint, script tests, code health and whitespace.325 other changed files remain outside this scope. Current app discovery still passes337 sites, with no new application finding or census change. No title/default/native work occurred; the ownership handoff remains pending.


### User-reported To-do Banner header and search

Andrew supplied a screenshot with the banner header too near the handle and the old bordered search field, and requested a fix then continuation. Current source already uses shared SearchField (INP-107); it supplies filled/flat material, search/clear icons and a single clear owner. No Metro process was listening before verification, so the screenshot does not establish current-source rendering.

Reproduced the header bug with a failing rendered-component regression: a nested BottomDrawerScrollView removed the drawer's handle spacer even though the title/tabs were fixed above it. Added underlapsHandle (default true) to the shared scroll wrapper. ArcBannerSheet sets false, retaining the standard handle allowance above the fixed header and avoiding duplicate allowance inside its results. Existing default edge-underlap behavior is unchanged. The new prop is consumed by the wrapper rather than forwarded to native ScrollView. No custom header padding or search styling was added.

Focused drawer/SearchField checks pass25 tests. Final scoped gate /tmp/kwilt-banner-header-local.log passed86.46s, exit0, not stale:124 suites/764 tests, app/test types, architecture, code health and whitespace.321 other changed files were omitted; the input census remains200 controls/137 hosts. Mac UI access reported a locked Mac with automatic unlock paused after physical input, so native visual acceptance is pending manual unlock. Booted Simulator is iPhone17Pro/iOS26.5 D437E709-EF87-49B1-A6C1-7AE350C0BF8A; source is main9baf1a4a plus shared dirty work. A new task-owned localhost Metro8081 process was started from the normal checkout (session1908, /tmp/kwilt-input-metro.log); no build/install or image selection occurred. Resume by checking the current app state and loading this bundle after unlock, then continue the remaining unification gates.


Task08 continuation: Activity draft and Narrative title native construction consolidated into TitleInput with an exact owned-editor exception and separate persistence policies. Source census reconciles338 active sites; remaining planned native source sites are the three picker/default branches. Gate `/tmp/kwilt-title-consolidation-local.log` passes36.22s (6 Jest tests,44 script tests,types,architecture,health,whitespace). Persisted To-do long ending caret and first-tap Done observed; draft and broad native acceptance not closed. See latest evidence receipt; no Task10 default flip or Task12 integration claim yet.


Relation-search continuation: INP-180 compatibility native renderer retired into existing SearchField.11 focused tests pass; native query filter/first-tap clear/close/reopen reset observed. No selection persisted. Remaining planned source sites INP-178/179; shared default retirement and all wider acceptance requirements remain intact.


Picker forwarding continuation: all30 external picker sites were inspected in current AST and explicitly use unified. FixedSet trigger now forwards named props instead of a broad spread; relation forwarding is already explicit. INP-178/179 are implemented-awaiting-native with narrow temporary compatibility exceptions. No planned source-disposition rows remain, but native acceptance and Task10 defaults/API cleanup remain required; an empty baseline debt array is not a completion claim.


Task10 source/API cleanup receipt: defaults switched after all caller source dispositions were reconciled; full native acceptance remains open. InputTreatment and migration flags removed; shared frame/preview legacy branches removed; unused surface/ghost variants and elevated input typing retired. Exact census337 sites remains. Task10 native/default-switch coverage and Task11/12 acceptance/review remain unchecked. Scoped gate112.69s passes131 suites/816 tests plus required static/script checks; current material export and native/site cmp pass. Latest evidence README details source and runtime limits.
