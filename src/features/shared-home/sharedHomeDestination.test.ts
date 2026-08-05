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
});
