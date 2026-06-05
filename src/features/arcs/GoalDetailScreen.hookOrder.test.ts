import { readFileSync } from 'fs';
import path from 'path';

describe('GoalDetailScreen hook order', () => {
  it('keeps the missing-goal render guard after all top-level hooks', () => {
    const source = readFileSync(path.join(__dirname, 'GoalDetailScreen.tsx'), 'utf8');
    const lines = source.split('\n');
    const goalGuardIndex = lines.findIndex((line) => line === '  if (!goal) {');
    const mainReturnIndex = lines.findIndex(
      (line, index) => index > goalGuardIndex && line === '  return (',
    );

    expect(goalGuardIndex).toBeGreaterThan(-1);
    expect(mainReturnIndex).toBeGreaterThan(goalGuardIndex);

    const afterGoalGuard = lines.slice(goalGuardIndex + 1, mainReturnIndex);
    const topLevelHookLines = afterGoalGuard.filter(
      (line) =>
        /^  const .*= use[A-Z][A-Za-z0-9_]*\(/.test(line) ||
        /^  use[A-Z][A-Za-z0-9_]*\(/.test(line),
    );

    expect(topLevelHookLines).toEqual([]);
  });
});
