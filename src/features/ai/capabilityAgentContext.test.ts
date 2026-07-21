import { canRestoreCapabilityObject, deriveCapabilityAgentContext, resolveCapabilityAgentReturn } from './capabilityAgentContext';

type TestNavigationState = {
  index: number;
  routes: Array<{
    name: string;
    params?: Record<string, unknown>;
    state?: TestNavigationState;
  }>;
};

const state = (
  name: string,
  child?: TestNavigationState,
  params?: Record<string, unknown>,
): TestNavigationState => ({
  index: 0,
  routes: [{ name, params, state: child }],
});

describe('capability Agent context', () => {
  it('captures To-dos inventory without private content', () => {
    expect(deriveCapabilityAgentContext(state('MainTabs', state('ActivitiesTab', state('ActivitiesList'))))).toEqual({
      capabilityId: 'todos', surface: 'inventory', returnTarget: expect.any(Object),
    });
  });

  it.each([
    ['ActivityDetail', 'activityId', 'activity', 'activity-1'],
    ['GoalDetail', 'goalId', 'goal', 'goal-1'],
  ])('captures exact %s identity', (screen, param, type, id) => {
    const tab = screen === 'ActivityDetail' ? 'ActivitiesTab' : 'GoalsTab';
    const context = deriveCapabilityAgentContext(state('MainTabs', state(tab, state(screen, undefined, { [param]: id }))));
    expect(context?.object).toEqual({ type, id });
    expect(JSON.stringify(context)).not.toContain('title');
  });

  it('captures and resolves a Chapter detail return', () => {
    const context = deriveCapabilityAgentContext(state('MainTabs', state('MoreTab', state('MoreChapterDetail', undefined, { chapterId: 'chapter-1' }))));
    expect(context?.object).toEqual({ type: 'chapter', id: 'chapter-1' });
    expect(resolveCapabilityAgentReturn(context!)).toMatchObject({
      params: { screen: 'MoreTab', params: { screen: 'MoreChapterDetail', params: { chapterId: 'chapter-1' } } },
    });
  });

  it('rejects a deleted object so the caller can return to the capability root', () => {
    const context = deriveCapabilityAgentContext(state('MainTabs', state('ActivitiesTab', state('ActivityDetail', undefined, { activityId: 'deleted' }))));
    expect(canRestoreCapabilityObject(context!, {
      activityIds: new Set(), goalIds: new Set(), arcIds: new Set(),
    })).toBe(false);
  });
});
