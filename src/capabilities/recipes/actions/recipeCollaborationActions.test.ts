import { createRecipeCollaborationActions, type RecipeCollaborationActionBoundary } from './recipeCollaborationActions';

describe('Recipe collaboration actions', () => {
  test('requires explicit review and exact Recipe version', async () => {
    const boundary: RecipeCollaborationActionBoundary = { invite: jest.fn() };
    const actions = createRecipeCollaborationActions(boundary);
    await expect(actions.invite({ requestId: 'invite-1', confirmed: false, recipeId: 'recipe-1',
      recipientPersonId: 'person-2', role: 'viewer', expectedVersion: 2 }))
      .rejects.toThrow('recipe_collaboration.confirmation_required');
    await expect(actions.invite({ requestId: 'invite-1', confirmed: true, recipeId: 'recipe-1',
      recipientPersonId: 'person-2', role: 'viewer', expectedVersion: 0 }))
      .rejects.toThrow('recipe_collaboration.invalid_invite');
    expect(boundary.invite).not.toHaveBeenCalled();
  });

  test('applies the selected person and bounded role through the capability boundary', async () => {
    const receipt = { grantId: 'grant-1', recipeId: 'recipe-1', recipientPersonId: 'person-2',
      role: 'contributor' as const, status: 'active' as const, version: 2, replayed: false };
    const boundary: RecipeCollaborationActionBoundary = { invite: jest.fn(async () => receipt) };
    const actions = createRecipeCollaborationActions(boundary);
    await expect(actions.invite({ requestId: 'invite-1', confirmed: true, recipeId: 'recipe-1',
      recipientPersonId: 'person-2', role: 'contributor', expectedVersion: 2 })).resolves.toEqual(receipt);
    expect(boundary.invite).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'invite-1',
      recipientPersonId: 'person-2', role: 'contributor', expectedVersion: 2 }));
  });
});
