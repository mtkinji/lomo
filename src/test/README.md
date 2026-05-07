# Kwilt test harness

This folder contains the shared infrastructure used by both Layer 1
(unit / domain) and Layer 2 (component / integration) tests. It is **not**
a place for product code.

## What lives here

- `renderWithProviders.tsx` — wraps a component tree with the providers most
  Kwilt screens require: `SafeAreaProvider` (with deterministic insets), and
  optional `NavigationContainer` and `WorkflowRuntimeContext.Provider`.
- `storeFixtures.ts` — fixture builders (`arcFixture`, `goalFixture`,
  `activityFixture`) and `resetAllStores` / `setProEntitlement` /
  `seedDomain` helpers that keep Zustand state isolated per-test.
- `mocks/` — small, controllable replacements for native or
  network-touching modules so component tests stay deterministic and fast:
  - `expo-linear-gradient.tsx` — renders children inside a plain `View`.
  - `aiService.ts` — `KwiltAiQuotaExceededError`, `sendCoachChat`,
    `getOpenAiQuotaExceededStatus` mocks plus a `resetAiServiceMocks` helper.
  - `analytics.ts` — `useAnalytics` hook stub with `getAnalyticsMocks` /
    `resetAnalyticsMocks` for assertions.

Global mocks for `expo-linear-gradient`, `react-native-reanimated`,
`@gorhom/bottom-sheet`, and `@expo/vector-icons` live in
[`jest.setup.ts`](../../jest.setup.ts) so individual tests don't have to
register them.

## Layer 1 tests (unit / domain)

Place tests next to their source as `*.test.ts(x)` files. They should:

- Avoid React Native rendering when possible — call the function under test
  directly with fixture data.
- Use `arcFixture` / `goalFixture` / `activityFixture` to build domain
  objects so tests don't break when new required fields are added.
- Use `jest.useFakeTimers()` and `jest.setSystemTime(new Date('YYYY-MM-DDTHH:mm:ss.sssZ'))`
  for time-dependent code (always pass an explicit ISO string — bare numeric
  arguments are timezone-sensitive and have caused flakes in CI).
- Avoid bare `'YYYY-MM-DD'` literals when comparing scheduled dates; build
  ISO strings via `new Date(year, monthIdx, day, 12, 0, 0).toISOString()` so
  the local date key is stable across timezones.

## Layer 2 tests (component / integration)

Use `@testing-library/react-native` together with `renderWithProviders`:

```tsx
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores } from '../../test/storeFixtures';

describe('MyScreen', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it('renders the primary CTA', () => {
    const { getByText } = renderWithProviders(<MyScreen />, {
      withNavigation: true,
    });
    expect(getByText('Continue')).toBeTruthy();
  });
});
```

Conventions:

- **Reset stores in `beforeEach`.** Zustand state otherwise leaks between
  tests and creates order-dependent failures.
- **Mock heavy children, not the screen under test.** Replace large nested
  features (sheets, lists with native virtualization, AI chat panes) with
  trivial `<View />` stubs so the test can focus on the screen's own
  behavior. Example: `PlanScreen.test.tsx` mocks `WeeklyRecapCard`,
  `RecommendationsBottomSheet`, etc.
- **Hoist mocks correctly.** `jest.mock(...)` factories are hoisted above
  imports, so `jest.fn()` declared in the outer module scope can be
  `undefined` when the factory runs. Either declare the spy *inside* the
  factory and re-export it via a namespaced property, or use
  `jest.requireMock(...)` after `jest.mock(...)` has run.
- **Don't assert on `toJSON() === null` when wrapped in providers.** The
  harness always renders a `SafeAreaProvider`, so a "renders nothing" branch
  should be tested via `queryByText` / `queryByTestId` returning `null`.

## Mocks for `node_modules`

Some packages ship untranspiled ESM that breaks the default `jest-expo`
allow-list. The `transformIgnorePatterns` in [`jest.config.js`](../../jest.config.js)
adds `@rn-primitives` and `@gorhom` so they go through Babel. If you import
a new package that breaks tests with `SyntaxError: Unexpected token '<'`,
add it to that allow-list.

## Coverage

`jest.config.js` collects coverage from `src/domain`, `src/services`,
`src/store`, `src/utils`, and `src/features` (with a few large screens
explicitly ignored until they have Layer 2 tests). Global thresholds are
re-baselined to current measured numbers — when adding tests that move
coverage meaningfully, raise the thresholds in the same PR so future
regressions are caught.

## Out of scope

- Native simulator runs, Maestro, and visual regression. Those live in
  separate workflows and run on schedule rather than per-PR.
- TestFlight and Supabase Edge Function expansion (covered by their own
  test suites under `supabase/functions/_shared/__tests__`).
