import { resolveSharedHomeDestination } from './sharedHomeDestination';

describe('resolveSharedHomeDestination', () => {
  it('opens a Goal invitation at its existing review surface', () => {
    expect(resolveSharedHomeDestination({ kind: 'goal_invite', inviteCode: 'GOAL12' })).toEqual([
      'MainTabs',
      {
        screen: 'GoalsTab',
        params: { screen: 'JoinSharedGoal', params: { inviteCode: 'GOAL12' } },
      },
    ]);
  });

  it('opens a game turn in its exact remote room', () => {
    expect(resolveSharedHomeDestination({ kind: 'game_room', sessionId: 'room-1' })).toEqual([
      'Games',
      { screen: 'GamesRemote', params: { sessionId: 'room-1' } },
    ]);
  });

  it('opens shared Goal content at the authoritative Goal', () => {
    expect(resolveSharedHomeDestination({ kind: 'goal', goalId: 'goal-1' })).toEqual([
      'MainTabs',
      {
        screen: 'GoalsTab',
        params: {
          screen: 'GoalDetail',
          params: { goalId: 'goal-1', entryPoint: 'goalsTab' },
        },
      },
    ]);
  });

  it('opens a meal choice invitation at an authoritative participant refetch', () => {
    expect(resolveSharedHomeDestination({ kind: 'meal_choice', roundId: 'round-1' })).toEqual([
      'Food', { screen: 'MealChoiceResponse', params: { roundId: 'round-1' } },
    ]);
  });
});
