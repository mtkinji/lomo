import { createRecipeCookRepository } from './recipeCookRepository';

function chain() { const value: any = { select: jest.fn(), eq: jest.fn(), order: jest.fn(), limit: jest.fn(), maybeSingle: jest.fn() }; value.select.mockReturnValue(value); value.eq.mockReturnValue(value); value.order.mockReturnValue(value); return value; }

describe('Recipe Cook record projection', () => {
  it('returns bounded recent private learnings without Recipe text', async () => {
    const rows = [{ id: 'record-1', session_id: 'session-1', recipe_id: 'recipe-1', recipe_version_id: 'version-2', serving_scale: '1.5', would_make_again: true, private_note: 'More sauce', completed_at: '2026-08-05T12:00:00.000Z' }];
    const records = chain(); records.limit.mockResolvedValue({ data: rows, error: null });
    await expect(createRecipeCookRepository({ from: jest.fn(() => records) } as never).listRecent(100)).resolves.toEqual([{ id: 'record-1', sessionId: 'session-1', recipeId: 'recipe-1', recipeVersionId: 'version-2', servingScale: 1.5, wouldMakeAgain: true, privateNote: 'More sauce', completedAt: '2026-08-05T12:00:00.000Z' }]);
    expect(records.limit).toHaveBeenCalledWith(20);
  });

  it('returns the latest learning for one exact Recipe', async () => {
    const record = { id: 'record-2', session_id: 'session-2', recipe_id: 'recipe-1', recipe_version_id: 'version-3', serving_scale: 1, would_make_again: null, private_note: null, completed_at: '2026-08-06T12:00:00.000Z' };
    const records = chain(); records.limit.mockReturnValue(records); records.maybeSingle.mockResolvedValue({ data: record, error: null });
    await expect(createRecipeCookRepository({ from: jest.fn(() => records) } as never).latestForRecipe('recipe-1')).resolves.toMatchObject({ id: 'record-2', recipeVersionId: 'version-3' });
    expect(records.eq).toHaveBeenCalledWith('recipe_id', 'recipe-1');
  });
});
