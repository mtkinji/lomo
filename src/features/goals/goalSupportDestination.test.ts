import { buildGoalSupportDestinationParams } from '../../navigation/goalSupportDestination';

describe('buildGoalSupportDestinationParams', () => {
  it('opens accepted and already-joined invitations in the Goal support context', () => {
    expect(buildGoalSupportDestinationParams('goal-1')).toEqual({
      goalId: 'goal-1',
      entryPoint: 'goalsTab',
      initialTab: 'details',
      openActivitySheet: true,
    });
  });
});
