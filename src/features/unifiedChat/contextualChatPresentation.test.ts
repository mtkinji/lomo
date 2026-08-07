import { getFreshDrawerCopy } from './contextualChatPresentation';

describe('contextual Chat presentation', () => {
  test('uses inventory language for the Goals list', () => {
    expect(getFreshDrawerCopy({
      capabilityId: 'goals',
      surface: 'inventory',
      returnTarget: { name: 'GoalsList' },
    })).toEqual({
      title: 'Chat about goals',
      placeholder: 'Ask about these goals',
    });
  });

  test('keeps singular language for a Goal detail launch', () => {
    expect(getFreshDrawerCopy({
      capabilityId: 'goals',
      surface: 'detail',
      object: { type: 'goal', id: 'goal-1' },
      returnTarget: { name: 'GoalDetail' },
    })).toEqual({
      title: 'Chat about this goal',
      placeholder: 'Ask about this goal',
    });
  });

  test('uses meal-planning language for the Meals inventory drawer', () => {
    expect(getFreshDrawerCopy({
      capabilityId: 'meal_planning',
      surface: 'inventory',
      returnTarget: { name: 'Food', params: { screen: 'RecipeLibrary' } },
    })).toEqual({
      title: 'Plan this week',
      placeholder: 'What should this plan account for?',
    });
  });
});
