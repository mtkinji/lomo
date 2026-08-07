import assert from 'node:assert/strict';
import test from 'node:test';

import {
  countUnmarkedBrandGreenUsages,
  findBrandGreenUsageIncrease,
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
