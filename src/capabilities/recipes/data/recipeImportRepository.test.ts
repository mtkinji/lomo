import { parseRecipeImportProjection } from './recipeImportRepository';

describe('Recipe import repository', () => {
  test('requires and preserves the exact review-draft version', () => {
    const row = {
      id: 'draft-1', version: 3, state: 'needs_review', source_method: 'photo',
      extracted_data: { title: 'Soup' }, evidence: {}, warnings: ['Check quantity'],
      expires_at: '2026-09-01T00:00:00.000Z',
    };
    expect(parseRecipeImportProjection(row)).toMatchObject({ id: 'draft-1', version: 3, method: 'photo' });
    expect(() => parseRecipeImportProjection({ ...row, version: undefined })).toThrow('Invalid recipe import draft');
  });
});
