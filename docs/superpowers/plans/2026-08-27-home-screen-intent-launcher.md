# Home Screen Intent Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a medium iOS Kwilt Launcher widget with four configurable shortcuts above a fixed Ask Kwilt action, while preserving exact destination, privacy, Chat, and Focus lifecycle contracts.

**Architecture:** Add a focused tracked Swift-template module consumed by the existing Expo WidgetKit generator. The template owns a bounded native destination registry, four scalar App Intent parameters, the medium SwiftUI layout, and compact Focus state. Existing React Navigation deep links remain authoritative; Focus state changes reload both the standalone and launcher widget kinds.

**Tech Stack:** JavaScript Expo config plugin, generated SwiftUI/WidgetKit/AppIntents, React Navigation deep links, Jest, Node test runner, Expo prebuild, Xcode/Swift compiler.

**Execution note:** Use the current checkout per `/Users/andrewwatanabe/Kwilt/AGENTS.md`; do not create a worktree. Do not commit or stage because the user requested implementation but not Git publication.

---

## File map

- Create `plugins/appleEcosystem/launcherWidgetSwift.js`: generate the bounded destination registry, four-slot App Intent configuration, timeline provider, and medium widget view.
- Modify `plugins/withAppleEcosystemIntegrations.js`: import/inject the launcher template and register `KwiltLauncherWidget` in the bundle.
- Modify `scripts/apple-widget-generator-contract.test.mjs`: enforce the generated-source contract before implementation.
- Modify `src/services/appleEcosystem/glanceableState.merge.test.ts`: require Focus changes to reload both Focus and Launcher immediately.
- Modify `src/services/appleEcosystem/glanceableState.ts`: publish that dual reload.
- Modify `src/services/appleEcosystem/widgetCenter.ts`: include `KwiltWidgets.launcher` in the valid full-reload kinds.
- Modify `src/navigation/linkingConfig.test.ts`: prove every launcher deep link reaches the expected owning surface with widget attribution.
- Modify `src/navigation/linkingConfig.ts` and route-param types for any route case that drops `source=widget`, using the explicit object-and-parser shape shown in Task 4.
- Modify `src/features/account/WidgetsSettingsScreen.tsx` and `src/features/activities/ActivitiesScreen.tsx`: describe the configurable launcher rather than a nonexistent Today surface.
- Update product/design docs already created for the loop and link the brief from affected feature manifests.

### Task 1: Write failing native generator contracts

**Files:**
- Modify: `scripts/apple-widget-generator-contract.test.mjs`

- [ ] **Step 1: Load the not-yet-created launcher template**

```js
const launcherWidgetTemplate = await readFile(
  new URL('../plugins/appleEcosystem/launcherWidgetSwift.js', import.meta.url),
  'utf8',
).catch(() => '');
```

- [ ] **Step 2: Add the launcher contract assertions**

```js
test('Kwilt Launcher provides four configurable shortcuts and a stable Ask Kwilt action', () => {
  assert.match(launcherWidgetTemplate, /struct LauncherWidgetConfigurationIntent: WidgetConfigurationIntent/);
  assert.equal((launcherWidgetTemplate.match(/@Parameter\(title: "Shortcut [1-4]"/g) ?? []).length, 4);
  assert.match(launcherWidgetTemplate, /"focus"/);
  assert.match(launcherWidgetTemplate, /"calendar"/);
  assert.match(launcherWidgetTemplate, /"todos"/);
  assert.match(launcherWidgetTemplate, /"meals"/);
  assert.match(launcherWidgetTemplate, /Text\("Ask Kwilt"\)/);
  assert.match(launcherWidgetTemplate, /kwilt:\/\/chat\?entry=fresh&mode=conversation&source=widget/);
  assert.match(launcherWidgetTemplate, /\.supportedFamilies\(\[\.systemMedium\]\)/);
  assert.match(widgetGenerator, /getLauncherWidgetSwift\(targetName\)/);
  assert.match(widgetGenerator, /KwiltLauncherWidget\(\)/);
});
```

- [ ] **Step 3: Add privacy, destination, and Focus-state assertions**

```js
test('Kwilt Launcher keeps destinations bounded and projects only Focus state', () => {
  for (const route of ['kwilt://focus?source=widget', 'kwilt://plan?source=widget', 'kwilt://todos?source=widget', 'kwilt://todos?openQuickAdd=1&source=widget']) {
    assert.match(launcherWidgetTemplate, new RegExp(route.replace(/[?]/g, '\\?')));
  }
  assert.match(launcherWidgetTemplate, /deepLinkFocusControls\(focus\)/);
  assert.match(launcherWidgetTemplate, /Text\(timerInterval:/);
  assert.doesNotMatch(launcherWidgetTemplate, /threadTitle|eventTitle|remainingCents|activity\.title/);
});
```

- [ ] **Step 4: Run the generator contract and observe the expected failure**

Run: `node --test scripts/apple-widget-generator-contract.test.mjs`

Expected: FAIL because `launcherWidgetSwift.js`, `getLauncherWidgetSwift`, and `KwiltLauncherWidget` do not exist.

### Task 2: Write failing lifecycle and route contracts

**Files:**
- Modify: `src/services/appleEcosystem/glanceableState.merge.test.ts`
- Modify: `src/navigation/linkingConfig.test.ts`

- [ ] **Step 1: Require dual Focus reload**

```ts
expect(scheduleWidgetReloadMock).toHaveBeenLastCalledWith(
  ['KwiltWidgets.focus', 'KwiltWidgets.launcher'],
  { immediate: true },
);
```

- [ ] **Step 2: Add a launcher route matrix**

```ts
test.each([
  ['plan?source=widget', 'PlanTab'],
  ['todos?source=widget', 'ActivitiesList'],
  ['todos?openQuickAdd=1&source=widget', 'ActivitiesList'],
  ['goals?source=widget', 'GoalsList'],
  ['arcs?source=widget', 'ArcsList'],
  ['chapters?source=widget', 'MoreChapters'],
  ['food/plan?source=widget', 'NextMeals'],
  ['food?source=widget', 'RecipeLibrary'],
  ['food/groceries?source=widget', 'GroceryList'],
  ['chores?source=widget', 'Chores'],
  ['money?source=widget', 'MoneySummary'],
  ['settings/screen-time?source=widget', 'SettingsScreenTimeProtection'],
  ['games?source=widget', 'GamesShelf'],
  ['explore?source=widget', 'ExploreMap'],
])('%s opens %s from the launcher', (path, routeName) => {
  const leaf = parse(path);
  expect(leaf?.name).toBe(routeName);
  expect(leaf?.params).toMatchObject({ source: 'widget' });
});
```

- [ ] **Step 3: Run focused tests and observe failures**

Run: `npm test -- --runInBand src/services/appleEcosystem/glanceableState.merge.test.ts src/navigation/linkingConfig.test.ts`

Expected: lifecycle FAIL until launcher reload is added; route failures identify only destinations whose linking config needs an explicit `source` parser.

### Task 3: Implement the launcher Swift template

**Files:**
- Create: `plugins/appleEcosystem/launcherWidgetSwift.js`

- [ ] **Step 1: Define the bounded destination registry**

```swift
struct LauncherDestination {
  let id: String
  let label: String
  let systemImage: String
  let deepLink: String
}

let launcherDestinations: [LauncherDestination] = [
  .init(id: "focus", label: "Focus", systemImage: "timer", deepLink: "kwilt://focus?source=widget"),
  .init(id: "calendar", label: "Calendar", systemImage: "calendar", deepLink: "kwilt://plan?source=widget"),
  .init(id: "todos", label: "To-dos", systemImage: "checklist", deepLink: "kwilt://todos?source=widget"),
  .init(id: "add_todo", label: "Add To-do", systemImage: "plus.circle", deepLink: "kwilt://todos?openQuickAdd=1&source=widget"),
  .init(id: "goals", label: "Goals", systemImage: "target", deepLink: "kwilt://goals?source=widget"),
  .init(id: "arcs", label: "Arcs", systemImage: "safari", deepLink: "kwilt://arcs?source=widget"),
  .init(id: "chapters", label: "Chapters", systemImage: "book.closed", deepLink: "kwilt://chapters?source=widget"),
  .init(id: "meals", label: "Meals", systemImage: "fork.knife", deepLink: "kwilt://food/plan?source=widget"),
  .init(id: "recipes", label: "Recipes", systemImage: "book", deepLink: "kwilt://food?source=widget"),
  .init(id: "groceries", label: "Groceries", systemImage: "cart", deepLink: "kwilt://food/groceries?source=widget"),
  .init(id: "chores", label: "Chores", systemImage: "checkmark.circle", deepLink: "kwilt://chores?source=widget"),
  .init(id: "money", label: "Money", systemImage: "wallet.pass", deepLink: "kwilt://money?source=widget"),
  .init(id: "screen_time", label: "Screen Time", systemImage: "shield", deepLink: "kwilt://settings/screen-time?source=widget"),
  .init(id: "games", label: "Games", systemImage: "gamecontroller", deepLink: "kwilt://games?source=widget"),
  .init(id: "explore", label: "Explore", systemImage: "map", deepLink: "kwilt://explore?source=widget"),
]
```

- [ ] **Step 2: Define four scalar App Intent parameters with slot defaults**

```swift
func launcherOptionItems() -> IntentItemCollection<String> {
  IntentItemCollection(sections: [
    IntentItemSection(items: launcherDestinations.map {
      IntentItem($0.id, title: LocalizedStringResource(stringLiteral: $0.label))
    })
  ])
}

struct LauncherShortcutOneOptionsProvider: DynamicOptionsProvider {
  func results() async throws -> IntentItemCollection<String> { launcherOptionItems() }
  func defaultResult() async -> String? { "focus" }
}
struct LauncherShortcutTwoOptionsProvider: DynamicOptionsProvider {
  func results() async throws -> IntentItemCollection<String> { launcherOptionItems() }
  func defaultResult() async -> String? { "calendar" }
}
struct LauncherShortcutThreeOptionsProvider: DynamicOptionsProvider {
  func results() async throws -> IntentItemCollection<String> { launcherOptionItems() }
  func defaultResult() async -> String? { "todos" }
}
struct LauncherShortcutFourOptionsProvider: DynamicOptionsProvider {
  func results() async throws -> IntentItemCollection<String> { launcherOptionItems() }
  func defaultResult() async -> String? { "meals" }
}

struct LauncherWidgetConfigurationIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Kwilt Launcher"
  static var description = IntentDescription("Choose four Kwilt shortcuts.")

  @Parameter(title: "Shortcut 1", optionsProvider: LauncherShortcutOneOptionsProvider())
  var shortcut1: String?
  @Parameter(title: "Shortcut 2", optionsProvider: LauncherShortcutTwoOptionsProvider())
  var shortcut2: String?
  @Parameter(title: "Shortcut 3", optionsProvider: LauncherShortcutThreeOptionsProvider())
  var shortcut3: String?
  @Parameter(title: "Shortcut 4", optionsProvider: LauncherShortcutFourOptionsProvider())
  var shortcut4: String?
}
```

- [ ] **Step 3: Resolve the entry from configuration and App Group Focus state**

```swift
struct LauncherWidgetEntry: TimelineEntry {
  let date: Date
  let shortcutIds: [String]
  let focusSession: GlanceableStateV1.FocusSession?
}
```

Build a timeline with an end-of-Focus refresh matching the standalone Focus provider, then fall back to a 15-minute policy.

- [ ] **Step 4: Render four labeled links above the fixed Ask Kwilt link**

Use `HStack(spacing: 8)` for four equal-width shortcut cells and a full-width pine rounded rectangle below. Each cell shows an SF Symbol, one-line label, and a content shape. If a cell resolves to Focus and Focus is active, show the timer or paused minutes and route through `deepLinkFocusControls`.

- [ ] **Step 5: Export the template function**

```js
module.exports = { getLauncherWidgetSwift };
```

### Task 4: Integrate generation, lifecycle reload, and routing

**Files:**
- Modify: `plugins/withAppleEcosystemIntegrations.js`
- Modify: `src/services/appleEcosystem/widgetCenter.ts`
- Modify: `src/services/appleEcosystem/glanceableState.ts`
- Modify for any red route case: `src/navigation/linkingConfig.ts`, `src/navigation/RootNavigator.tsx`, `src/navigation/routeParams.ts`

- [ ] **Step 1: Import and inject the template**

```js
const { getLauncherWidgetSwift } = require('./appleEcosystem/launcherWidgetSwift');
```

Insert `${getLauncherWidgetSwift(targetName)}` after the Chat/Focus templates.

- [ ] **Step 2: Register the widget**

```swift
KwiltLauncherWidget()
```

Place it in the iOS 17 widget bundle beside the existing Chat and Focus registrations.

- [ ] **Step 3: Add the launcher kind and dual Focus reload**

```ts
export const KWILT_WIDGET_KINDS = [
  // existing kinds
  'KwiltWidgets.launcher',
];
```

```ts
scheduleWidgetReload(['KwiltWidgets.focus', 'KwiltWidgets.launcher'], { immediate: true });
```

- [ ] **Step 4: Make only the parser changes demanded by the route matrix**

For any matrix case that reaches the right leaf but drops attribution, convert the leaf from a string to this exact object form and add `source?: string` to its route-param type:

```ts
PlanTab: {
  path: 'plan',
  parse: {
    source: (value: string) => String(value),
  },
},
```

Apply the same `path` plus `parse.source` shape to the specific failing leaf. Do not add new screens or navigation layers.

- [ ] **Step 5: Run focused tests until green**

Run: `node --test scripts/apple-widget-generator-contract.test.mjs`

Run: `npm test -- --runInBand src/services/appleEcosystem/glanceableState.merge.test.ts src/navigation/linkingConfig.test.ts`

Expected: both commands exit 0.

### Task 5: Update widget discovery and product links

**Files:**
- Modify: `src/features/account/WidgetsSettingsScreen.tsx`
- Modify: `src/features/activities/ActivitiesScreen.tsx`
- Modify: `src/features/activities/FEATURE.md`
- Create/update: `docs/feature-briefs/home-screen-intent-launcher.md`
- Create/update: `docs/design-explorations/home-screen-intent-launcher/*.md`

- [ ] **Step 1: Replace stale Today-focused setup copy**

Use: `Put Ask Kwilt and four shortcuts to the parts of Kwilt you use most on your Home Screen.`

Use instruction: `After adding the Kwilt Launcher, touch and hold it, choose Edit Widget, and pick all four shortcuts.`

- [ ] **Step 2: Keep product links minimal**

Link the brief slug from the `activities` manifest because the launcher brief uses Marcus's hero job and job flow. Keep the existing `chat-widget` brief as the Unified Chat manifest link because that folder has Nina's trust hero job; do not force a conflicting hero/job-flow backlink into Unified Chat. Do not create a feature manifest for `plugins/`, which is enabling infrastructure.

- [ ] **Step 3: Run product lint**

Run: `npm run product:lint`

Expected: exit 0 with no brief/manifest drift.

### Task 6: Generate, compile, and visually verify the native widget

**Files:**
- Generated/ignored: `ios/KwiltWidgets/KwiltWidgets.swift`

- [ ] **Step 1: Regenerate iOS from tracked source**

Run: `KWILT_ENABLE_WIDGETS=1 npx expo prebuild --platform ios --no-install`

Expected: exit 0 and generated `ios/KwiltWidgets/KwiltWidgets.swift` contains `KwiltLauncherWidget`.

- [ ] **Step 2: Re-run generator contracts against generated output**

Run: `node --test scripts/apple-widget-generator-contract.test.mjs`

Expected: exit 0.

- [ ] **Step 3: Typecheck/build the generated extension**

Run: `xcodebuild -workspace ios/Kwilt.xcworkspace -scheme KwiltWidgets -configuration Debug -destination 'platform=iOS Simulator,id=0332346E-C519-425C-8119-38253B73E553' build CODE_SIGNING_ALLOWED=NO`

Expected: `BUILD SUCCEEDED` or Swift compiler exit 0.

- [ ] **Step 4: Exercise the actual Home Screen flow**

Add `Kwilt Launcher` to the Simulator Home Screen, edit all four positions, capture the rendered default and edited states, tap each configured destination, and exercise Focus start/stop plus Ask Kwilt cold/warm entry.

Expected: four labeled controls remain legible, every route is exact, Focus refreshes, and Chat opens a fresh unsent composer.

### Task 7: Completion verification and review

**Files:**
- Review every path in the current diff.

- [ ] **Step 1: Run the repository completion gate once**

Run: `npm run verify:changed -- --run`

Expected: exit 0. Repeat only if it fails, the diff changes afterward, or the result is incomplete; state the reason.

- [ ] **Step 2: Inspect the final diff**

Run: `git diff --check`

Run: `git status --short`

Run: `git diff -- plugins/appleEcosystem/launcherWidgetSwift.js plugins/withAppleEcosystemIntegrations.js scripts/apple-widget-generator-contract.test.mjs src/services/appleEcosystem/widgetCenter.ts src/services/appleEcosystem/glanceableState.ts src/services/appleEcosystem/glanceableState.merge.test.ts src/navigation/linkingConfig.ts src/navigation/linkingConfig.test.ts src/navigation/RootNavigator.tsx src/navigation/routeParams.ts src/features/account/WidgetsSettingsScreen.tsx src/features/activities/ActivitiesScreen.tsx src/features/activities/FEATURE.md docs/feature-briefs/home-screen-intent-launcher.md docs/design-explorations/home-screen-intent-launcher docs/superpowers/plans/2026-08-27-home-screen-intent-launcher.md`

Expected: only intended launcher and documentation changes; the unrelated Money/Screen Time plan remains untouched.

- [ ] **Step 3: Report proof boundaries honestly**

Separate source/tests, generated Swift, native build, Simulator Home Screen behavior, signed-device/TestFlight behavior, and public release. Do not claim later gates from earlier evidence.
