import { createMealPlanningActivityCardProvider } from './mealPlanningActivityCardProvider';

describe('Meal Planning Activity card', () => {
  it('resolves a recurring organizer reminder to the current active cycle', async () => {
    const provider = createMealPlanningActivityCardProvider({ resolve: jest.fn().mockResolvedValue({ state: 'draft', responseCount: 0 }), navigate: jest.fn() });
    await expect(provider.resolve({ providerId: 'meal_planning', projectionKind: 'organizer_cycle', resourceRef: 'household-1', sourceVersion: '1' }, { viewerPersonId: 'person-1', activityId: 'activity-1' })).resolves.toEqual(expect.objectContaining({
      state: 'ready', title: 'Plan the next meals', primaryAction: expect.objectContaining({ id: 'open_plan' }),
    }));
  });

  it('offers choose or pass for a participant round and degrades after closure', async () => {
    const resolve = jest.fn().mockResolvedValueOnce({ state: 'open', responseCount: 0 }).mockResolvedValueOnce({ state: 'closed', responseCount: 2 });
    const provider = createMealPlanningActivityCardProvider({ resolve, navigate: jest.fn() });
    const binding = { providerId: 'meal_planning' as const, projectionKind: 'participant_round', resourceRef: 'round-1', sourceVersion: '1' };
    await expect(provider.resolve(binding, { viewerPersonId: 'person-2', activityId: 'activity-2' })).resolves.toEqual(expect.objectContaining({ primaryAction: expect.objectContaining({ id: 'choose' }), secondaryAction: expect.objectContaining({ id: 'pass' }) }));
    await expect(provider.resolve(binding, { viewerPersonId: 'person-2', activityId: 'activity-2' })).resolves.toEqual(expect.objectContaining({ state: 'completed', primaryAction: null }));
  });

  it('only navigates to authority; completing the Activity does not mutate a plan or round', async () => {
    const navigate = jest.fn();
    const provider = createMealPlanningActivityCardProvider({ resolve: jest.fn().mockResolvedValue({ state: 'open', responseCount: 0 }), navigate });
    const receipt = await provider.invoke({ binding: { providerId: 'meal_planning', projectionKind: 'participant_round', resourceRef: 'round-1', sourceVersion: '1' }, context: { viewerPersonId: 'person-2', activityId: 'activity-2' }, actionId: 'pass', idempotencyKey: 'action-1' });
    expect(navigate).toHaveBeenCalledWith({ screen: 'MealChoiceResponse', params: { roundId: 'round-1', intent: 'pass' } });
    expect(receipt.outcome).toBe('completed');
  });

  it('summarizes unresolved fit without leaking a person or ingredient', async () => {
    const provider = createMealPlanningActivityCardProvider({ resolve: jest.fn().mockResolvedValue({ state: 'ready_to_finalize', responseCount: 0, unresolvedMealCount: 1 }), navigate: jest.fn() });
    const card = await provider.resolve({ providerId: 'meal_planning', projectionKind: 'organizer_cycle', resourceRef: 'household-1', sourceVersion: '1' }, { viewerPersonId: 'person-1', activityId: 'activity-1' });
    expect(card.detail).toBe('1 meal needs attention.');
    expect(card.detail).not.toMatch(/peanut|avery/i);
  });
});
