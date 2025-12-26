# Maestro E2E (local dev setup)

This repo uses **Maestro** for end-to-end (E2E) testing of native interactions like:

- keyboard avoidance / focus flows
- bottom drawer open/close regressions (e.g. “dead taps after close”)
- navigation smoke tests

Maestro runs against a **real simulator/device build** (iOS/Android).

---

## Where the tests live

- `e2e/maestro/*.yaml`

Starter flows:

- `e2e/maestro/smoke-devtools.yaml`
- `e2e/maestro/bottomdrawer-touch-regression.yaml`
- `e2e/maestro/keyboard-harness.yaml`
- `e2e/maestro/agent-workspace-smoke.yaml`
- `e2e/maestro/activities-quickadd.yaml`
- `e2e/maestro/activity-detail-key-actions.yaml`
- `e2e/maestro/activity-detail-triggers.yaml`
- `e2e/maestro/activity-detail-planning-notes-tags-steps.yaml`

---

## One-time install (macOS)

Install Maestro locally (recommended via Homebrew):

- `brew install maestro`

If you prefer not to use Homebrew, follow Maestro’s official install instructions.

---

## Run the tests

### 1) Boot the app on a simulator/device

Maestro needs an installed app with the correct `appId`.

- **iOS**: build & install your dev client, then launch it once.
- **Android**: build & install debug, then launch it once.

This repo’s current app id is set in `e2e/maestro/*.yaml` as:

- `com.andrewwatanabe.kwilt`

### 2) Run a single flow

From the repo root:

- `maestro test e2e/maestro/bottomdrawer-touch-regression.yaml`

### 3) Run the whole suite

- `maestro test e2e/maestro`

---

## If `expo run:ios` can’t target a simulator (workaround)

Some Expo CLI versions (or local Xcode setups) can mis-route `run:ios` to a physical device build.
If you already have `ios/kwilt.xcworkspace`, you can build/install for the simulator directly:

```sh
cd ios
xcodebuild \
  -workspace kwilt.xcworkspace \
  -scheme kwilt \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination "platform=iOS Simulator,name=iPhone 17 Pro" \
  -derivedDataPath build

xcrun simctl install booted build/Build/Products/Debug-iphonesimulator/kwilt.app
xcrun simctl launch booted com.andrewwatanabe.kwilt
```

Then run:

- `maestro test e2e/maestro`

---

## Test IDs we rely on

To keep E2E stable, we use `testID`s instead of visible text.

- Drawer toggle (hamburger): `nav.drawer.toggle`
- Drawer item: DevTools: `nav.drawer.item.DevTools`
- DevTools tab switcher: `devtools.tab.<value>` (e.g. `devtools.tab.e2e`)
- DevTools → Gallery harness:
  - `e2e.openBottomDrawer`
  - `e2e.closeBottomDrawer`
  - `e2e.tapTarget`
- DevTools → E2E harness:
  - `e2e.keyboard.lastInput`
  - `e2e.keyboard.tapWhileOpen`
  - `e2e.keyboard.submit`
  - `e2e.keyboard.openSheet`
  - `e2e.keyboard.sheetInput`
  - `e2e.keyboard.sheetSubmit`
  - `e2e.keyboard.closeSheet`
  - `e2e.agent.open`
  - `e2e.agent.sheetClose`

- DevTools → Tools (seed actions):
  - `e2e.seed.triggerFirstTimeUx`
  - `e2e.seed.showActivitiesListGuide`
  - `e2e.seed.showActivityDetailGuide`
  - `e2e.seed.showFirstArcCelebration`
  - `e2e.seed.showFirstGoalCelebration`

- AgentWorkspace (chat composer):
  - `agent.composer.input`
  - `agent.composer.send`

- Activities list + Quick Add dock:
  - `e2e.activities.quickAdd.open`
  - `e2e.activities.quickAdd.input`
  - `e2e.activities.quickAdd.submit`
  - `e2e.activities.quickAdd.done`

- Activity detail key actions + drawers:
  - `e2e.activityDetail.keyAction.focusMode`
  - `e2e.activityDetail.keyAction.addToCalendar`
  - `e2e.activityDetail.focus.cancel`
  - `e2e.activityDetail.calendar.close`

- Activity detail triggers:
  - `e2e.activityDetail.triggers.reminder.open`
  - `e2e.activityDetail.reminder.laterToday`
  - `e2e.activityDetail.reminder.tomorrow`
  - `e2e.activityDetail.reminder.nextWeek`
  - `e2e.activityDetail.triggers.dueDate.open`
  - `e2e.activityDetail.dueDate.today`
  - `e2e.activityDetail.dueDate.tomorrow`
  - `e2e.activityDetail.dueDate.nextWeek`
  - `e2e.activityDetail.dueDate.pickDate`
  - `e2e.activityDetail.dueDate.clear`
  - `e2e.activityDetail.triggers.repeat.open`
  - `e2e.activityDetail.repeat.daily`
  - `e2e.activityDetail.repeat.weekly`
  - `e2e.activityDetail.repeat.weekdays`
  - `e2e.activityDetail.repeat.monthly`
  - `e2e.activityDetail.repeat.yearly`
  - `e2e.activityDetail.repeat.custom`
  - `e2e.activityDetail.customRepeat.back`
  - `e2e.activityDetail.customRepeat.set`

- Activity detail planning + notes + tags + steps:
  - `e2e.activityDetail.planning.estimate.open`
  - `e2e.activityDetail.estimate.clear`
  - `e2e.activityDetail.estimate.save`
  - `e2e.activityDetail.steps.addRow`
  - `e2e.activityDetail.steps.newInput`
  - `e2e.activityDetail.notes`
  - `e2e.activityDetail.notes.editor.done`
  - `e2e.activityDetail.tags.open`
  - `e2e.activityDetail.tags.input`

---

## Debugging tips

- **If `nav.drawer.toggle` isn’t found**: you may be on a screen that shows a Back button instead of the menu button.
  - Run the flow from a “root” screen first (Activities/Arcs/Goals), or adjust the flow to navigate back to a root.
- **If DevTools isn’t visible**: it only exists in `__DEV__` builds.
- **If the appId doesn’t match**: update `appId:` at the top of the YAML flows.
- **If `npx expo run:ios` fails with `xcodebuild` error 70 / “Unable to find a destination”**:
  - This commonly happens when Xcode tries to target a **physical device** whose iOS version support files aren’t installed.
  - Quick fix: build for a simulator explicitly:
    - `npx expo run:ios --simulator "iPhone 16 Pro"`
  - If you actually want to build to a physical device, install the matching iOS platform/device support in Xcode (Xcode → Settings → Platforms/Components) or update Xcode.
- **Make failures actionable**:
  - Keep assertions simple (“button label changed”, “counter incremented”).
  - Use harness screens for tricky native layout/keyboard cases rather than relying on real data.


