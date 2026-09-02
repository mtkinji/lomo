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

  it('wires inline quick-add docks to persisted AI action preferences', () => {
    const source = readFileSync(path.join(__dirname, 'GoalDetailScreen.tsx'), 'utf8');
    const dockBlocks = source.match(/<QuickAddDock[\s\S]*?\/>/g) ?? [];

    expect(dockBlocks).toHaveLength(2);
    dockBlocks.forEach((block) => {
      expect(block).toContain('selectedAiActions={effectiveQuickAddAiActions}');
      expect(block).toContain('onSelectedAiActionsChange={setQuickAddAiActions}');
      expect(block).not.toContain('lockedAiActions=');
      expect(block).not.toContain('onLockedAiActionPress=');
      expect(block).toContain('onInlineChatPress={() => setGoalChatVisible(true)}');
      expect(block).toContain('inlineChatAccessibilityLabel="Chat about this goal"');
      expect(block).toContain('inlineSurfaceProminent={goalDockProminent}');
    });
  });

  it('uses the shared scroll-settle elevation lifecycle for the Goal dock', () => {
    const source = readFileSync(path.join(__dirname, 'GoalDetailScreen.tsx'), 'utf8');

    expect(source).toContain('useFloatingControlElevation()');
    expect(source).toContain('markGoalDockScrolling();');
    expect(source).toContain('onScrollEndDrag={markGoalDockSettled}');
    expect(source).toContain('onMomentumScrollBegin={markGoalDockScrolling}');
    expect(source).toContain('onMomentumScrollEnd={markGoalDockSettled}');
  });

  it('opens Unified Chat with the exact Goal detail context', () => {
    const source = readFileSync(path.join(__dirname, 'GoalDetailScreen.tsx'), 'utf8');

    expect(source).toContain("capabilityId: 'goals'");
    expect(source).toContain("object: { type: 'goal', id: goalId }");
    expect(source).toContain('source="goal_contextual_drawer"');
    expect(source).toContain('scopeLabel={goal.title}');
  });

  it('uses the current Goals nav icon in the Goal type pill', () => {
    const source = readFileSync(path.join(__dirname, 'GoalDetailScreen.tsx'), 'utf8');

    expect(source).toContain('<Icon name="navGoals" size={12} color={colors.textSecondary} />');
    expect(source).not.toContain('<Icon name="goals" size={12} color={colors.textSecondary} />');
  });
});
