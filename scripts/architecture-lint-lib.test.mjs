import assert from 'node:assert/strict';
import test from 'node:test';

import {
  countUnmarkedBrandGreenUsages,
  findBottomDockGeometryOverrides,
  findBrandGreenUsageIncrease,
  findRawInteractiveControlImports,
  findActionRuntimeBoundaryViolations,
} from './architecture-lint-lib.mjs';

test('counts product green tokens but ignores neutral color roles', () => {
  assert.equal(countUnmarkedBrandGreenUsages(`
    color: colors.pine700,
    borderColor: colors.accent,
    backgroundColor: colors.success,
    selected: 'pine300',
    neutral: colors.primary,
  `), 4);
});

test('allows green only when the source line names an explicit brand moment', () => {
  assert.equal(countUnmarkedBrandGreenUsages(`
    backgroundColor: colors.pine700, // @kwilt-brand-moment: launch identity
    color: colors.accent, // @kwilt-brand-moment: Kwilt lockup
  `), 0);
});

test('rejects increases while allowing existing green debt to stay flat or decrease', () => {
  const file = 'src/capabilities/example/ExampleScreen.tsx';
  const baseline = 'color: colors.accent;';

  assert.match(
    findBrandGreenUsageIncrease(file, `${baseline}\nbackgroundColor: colors.pine700;`, baseline) ?? '',
    /brand green usage increased from 1 to 2/,
  );
  assert.equal(findBrandGreenUsageIncrease(file, baseline, baseline), null);
  assert.equal(findBrandGreenUsageIncrease(file, 'color: colors.primary;', baseline), null);
});

test('rejects feature-level overrides of canonical ActionDock placement', () => {
  assert.deepEqual(
    findBottomDockGeometryOverrides(
      'src/features/example/ExampleScreen.tsx',
      '<ActionDock insetX={24} insetBottom={12} safeAreaLift="half" />',
    ),
    [
      'src/features/example/ExampleScreen.tsx: ActionDock geometry is canonical; remove insetX, insetBottom, and safeAreaLift overrides',
    ],
  );
});

test('allows dock internals and semantic placement without raw geometry overrides', () => {
  assert.deepEqual(
    findBottomDockGeometryOverrides(
      'src/ui/ActionDock.tsx',
      '<ActionDock insetX={24} insetBottom={12} safeAreaLift="half" />',
    ),
    [],
  );
  assert.deepEqual(
    findBottomDockGeometryOverrides(
      'src/features/example/ExampleScreen.tsx',
      '<ActionDock placement="phoneFloating" />',
    ),
    [],
  );
});

test('rejects raw React Native press controls outside the app-owned haptic boundary', () => {
  assert.deepEqual(
    findRawInteractiveControlImports(
      'src/features/example/ExampleScreen.tsx',
      `import { Pressable, StyleSheet, TouchableOpacity } from 'react-native';`,
    ),
    [
      'src/features/example/ExampleScreen.tsx: import app-owned Pressable and TouchableOpacity from src/ui/HapticPressable so enabled controls acknowledge taps',
    ],
  );
  assert.deepEqual(
    findRawInteractiveControlImports(
      'src/features/example/ExampleScreen.tsx',
      `import { Pressable } from '@/src/ui/HapticPressable';`,
    ),
    [],
  );
});

test('rejects drawer action geometry escape hatches in feature code', () => {
  assert.deepEqual(
    findBottomDockGeometryOverrides(
      'src/features/example/ExampleDrawer.tsx',
      `
        <BottomDrawer bottomAccessory={action} bottomAccessoryStyle={styles.footer} />
        <BottomDrawerFooter paddingHorizontal={0}>{action}</BottomDrawerFooter>
      `,
    ),
    [
      'src/features/example/ExampleDrawer.tsx: BottomDrawer action geometry is canonical; remove bottomAccessoryStyle',
      'src/features/example/ExampleDrawer.tsx: BottomDrawerFooter geometry is canonical; remove padding overrides',
    ],
  );
});

const actionBoundary = {
  version: 1,
  operations: [{
    id: 'activities.capture',
    actionModule: 'src/capabilities/todos/actions/todoActions.ts',
    protectedFiles: [{
      path: 'src/features/activities/ExampleScreen.tsx',
      forbiddenPatterns: [
        { pattern: 'state\\.addActivity', message: 'route activities.capture through its capability action' },
      ],
    }, {
      path: 'src/features/unifiedChat/exampleProvider.ts',
      forbiddenPatterns: [
        { pattern: 'store\\.addActivity\\(', message: 'do not duplicate the To-do create mutation in Chat' },
      ],
    }],
  }],
};

test('rejects a migrated screen selecting a raw repository mutation', () => {
  assert.deepEqual(findActionRuntimeBoundaryViolations(
    'src/features/activities/ExampleScreen.tsx',
    'const addActivity = useAppStore((state) => state.addActivity);',
    actionBoundary,
  ), [
    'src/features/activities/ExampleScreen.tsx: activities.capture: route activities.capture through its capability action',
  ]);
});

test('rejects Chat mutation duplication while allowing the capability action module', () => {
  assert.deepEqual(findActionRuntimeBoundaryViolations(
    'src/features/unifiedChat/exampleProvider.ts',
    'store.addActivity(activity);',
    actionBoundary,
  ), [
    'src/features/unifiedChat/exampleProvider.ts: activities.capture: do not duplicate the To-do create mutation in Chat',
  ]);
  assert.deepEqual(findActionRuntimeBoundaryViolations(
    'src/capabilities/todos/actions/todoActions.ts',
    'store.addActivity(activity);',
    actionBoundary,
  ), []);
});
