import {
  parseCapabilityNavigationRequest,
  resolveChatCapabilityNavigation,
} from './capabilityNavigationAction';

describe('parseCapabilityNavigationRequest', () => {
  it.each([
    'goals', 'todos', 'plan', 'arcs', 'chapters', 'money',
    'recipes', 'meal-planning', 'groceries', 'chores', 'focus',
    'household', 'savings', 'screen-time', 'notifications', 'account-settings',
  ])('allows the included %s capability', (capabilityId) => {
    expect(parseCapabilityNavigationRequest({ capabilityId })).toEqual({
      capabilityId,
      objectRef: null,
    });
  });

  it.each(['explore', 'games', 'Settings', 'GoalDetail', '', null, undefined])(
    'rejects excluded or arbitrary destination %p',
    (capabilityId) => {
      expect(parseCapabilityNavigationRequest({ capabilityId })).toBeNull();
    },
  );

  it.each([
    ['goals', 'goal'],
    ['todos', 'activity'],
    ['chapters', 'chapter'],
    ['recipes', 'recipe'],
  ])('allows a stable %s/%s object destination', (capabilityId, objectType) => {
    expect(parseCapabilityNavigationRequest({
      capabilityId,
      objectRef: { objectType, objectId: '  object-1  ' },
    })).toEqual({ capabilityId, objectRef: { objectType, objectId: 'object-1' } });
  });

  it.each([
    ['goals', 'activity'],
    ['todos', 'goal'],
    ['money', 'transaction'],
    ['recipes', 'RecipeHome'],
  ])('rejects unsupported %s/%s object pairings', (capabilityId, objectType) => {
    expect(parseCapabilityNavigationRequest({
      capabilityId,
      objectRef: { objectType, objectId: 'object-1' },
    })).toBeNull();
  });

  it('rejects malformed and extra input instead of accepting route-shaped payloads', () => {
    expect(parseCapabilityNavigationRequest({ capabilityId: 'goals', route: 'Settings' })).toBeNull();
    expect(parseCapabilityNavigationRequest({
      capabilityId: 'goals', objectRef: { objectType: 'goal', objectId: '   ' },
    })).toBeNull();
    expect(parseCapabilityNavigationRequest({
      capabilityId: 'goals', objectRef: { objectType: 'goal', objectId: 'goal-1', screen: 'Settings' },
    })).toBeNull();
  });
});

describe('resolveChatCapabilityNavigation', () => {
  it('opens included capability roots through the canonical capability resolver', () => {
    expect(resolveChatCapabilityNavigation({ capabilityId: 'groceries', objectRef: null })).toEqual({
      name: 'Food',
      params: {
        screen: 'GroceryList',
        params: { entryPoint: 'capability-menu' },
      },
    });
  });

  it.each([
    ['focus', { name: 'StandaloneFocus', params: { source: 'chat' } }],
    ['household', { name: 'Settings', params: { screen: 'SettingsHousehold' } }],
    ['savings', { name: 'Food', params: { screen: 'GrocerySavings' } }],
    ['screen-time', { name: 'Settings', params: { screen: 'SettingsScreenTimeProtection' } }],
    ['notifications', { name: 'Settings', params: { screen: 'SettingsNotifications' } }],
    ['account-settings', { name: 'Settings', params: { screen: 'SettingsHome' } }],
  ])('opens the included %s destination', (capabilityId, expected) => {
    expect(resolveChatCapabilityNavigation({
      capabilityId: capabilityId as never, objectRef: null,
    })).toEqual(expected);
  });

  it.each([
    ['goals', 'goal', 'goal-1', {
      name: 'MainTabs', params: { screen: 'GoalsTab', params: { screen: 'GoalDetail', params: { goalId: 'goal-1' } } },
    }],
    ['todos', 'activity', 'activity-1', {
      name: 'MainTabs', params: { screen: 'ActivitiesTab', params: { screen: 'ActivityDetail', params: { activityId: 'activity-1' } } },
    }],
    ['chapters', 'chapter', 'chapter-1', {
      name: 'MainTabs', params: { screen: 'MoreTab', params: { screen: 'MoreChapterDetail', params: { chapterId: 'chapter-1' } } },
    }],
    ['recipes', 'recipe', 'recipe-1', {
      name: 'Food', params: { screen: 'RecipeHome', params: { recipeId: 'recipe-1' } },
    }],
  ])('opens the stable %s/%s object', (capabilityId, objectType, objectId, expected) => {
    expect(resolveChatCapabilityNavigation({
      capabilityId: capabilityId as never,
      objectRef: { objectType: objectType as never, objectId },
    })).toEqual(expected);
  });
});
