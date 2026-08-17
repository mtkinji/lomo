import { getFreshDrawerCopy, getFreshDrawerOffers } from './contextualChatPresentation';

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

  test('uses selected-day language for the Plan drawer', () => {
    expect(getFreshDrawerCopy({
      capabilityId: 'plan',
      surface: 'detail',
      object: { type: 'day', id: '2026-08-17' },
      returnTarget: { name: 'MainTabs', params: { screen: 'PlanTab' } },
    })).toEqual({
      title: 'Chat about this day',
      placeholder: 'What should this day account for?',
    });
  });

  test('offers editable recipe-specific ways into a fresh Recipe detail chat', () => {
    const launchContext = {
      capabilityId: 'recipes' as const,
      surface: 'detail' as const,
      object: { type: 'recipe' as const, id: 'recipe-1' },
      returnTarget: { name: 'Food', params: { screen: 'RecipeHome' } },
    };

    expect(getFreshDrawerCopy(launchContext)).toEqual({
      title: 'Chat about this meal',
      placeholder: 'Ask about this meal',
    });
    expect(getFreshDrawerOffers(launchContext)).toEqual([
      expect.objectContaining({ id: 'recipe-swap', title: 'Swap an ingredient' }),
      expect.objectContaining({ id: 'recipe-revise', title: 'Make it ours' }),
      expect.objectContaining({ id: 'recipe-fit', title: 'Fit tonight' }),
      expect.objectContaining({ id: 'recipe-pantry', title: 'Use what we have' }),
    ]);
    expect(getFreshDrawerOffers(launchContext).every((offer) => offer.prompt.includes('this recipe'))).toBe(true);
  });
});
