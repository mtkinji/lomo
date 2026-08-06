import {
  RecipeContractError,
  parseRecipe,
} from './recipeContracts';
import {
  approveRecipeImport,
  parseRecipeImportApproval,
  parseRecipeImportDraft,
} from './recipeImportContracts';
import {
  familyRecipeFixture,
  multiPagePhotoDraftFixture,
  urlDraftFixture,
} from './recipeContractFixtures';

describe('Recipe import contracts', () => {
  test('retains source artifacts, per-field evidence, warnings, model version, and expiry', () => {
    const draft = parseRecipeImportDraft(multiPagePhotoDraftFixture);

    expect(draft.method).toBe('photo');
    expect(draft.sourceArtifacts.map((artifact) => artifact.page)).toEqual([1, 2]);
    expect(draft.fieldEvidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldPath: 'ingredients[0].originalText', confidence: 0.63 }),
    ]));
    expect(draft.modelVersion).toBe('fixture-model-v1');
    expect(draft.promptVersion).toBe('recipe-import-v1');
    expect(draft.state).toBe('needs_review');
  });

  test('accepts a source-grounded URL draft without turning it into a canonical Recipe', () => {
    const draft = parseRecipeImportDraft(urlDraftFixture);

    expect(draft.sourceMetadata.sourceUrl).toBe('https://example.test/recipe');
    expect(() => parseRecipe(draft)).toThrow(
      expect.objectContaining<Partial<RecipeContractError>>({ code: 'recipe.field.unknown' }),
    );
  });

  test('rejects confidence outside zero to one, unordered pages, and expired drafts', () => {
    expect(() => parseRecipeImportDraft({
      ...multiPagePhotoDraftFixture,
      fieldEvidence: [{ ...multiPagePhotoDraftFixture.fieldEvidence[0], confidence: -0.1 }],
    })).toThrow(expect.objectContaining<Partial<RecipeContractError>>({ code: 'recipe.import.confidence_invalid' }));

    expect(() => parseRecipeImportDraft({
      ...multiPagePhotoDraftFixture,
      sourceArtifacts: [...multiPagePhotoDraftFixture.sourceArtifacts].reverse(),
    })).toThrow(expect.objectContaining<Partial<RecipeContractError>>({ code: 'recipe.import.artifact_order_invalid' }));

    expect(() => parseRecipeImportDraft({
      ...multiPagePhotoDraftFixture,
      expiresAt: '2026-08-05T00:00:00.000Z',
    }, { now: '2026-08-06T00:00:00.000Z' })).toThrow(
      expect.objectContaining<Partial<RecipeContractError>>({ code: 'recipe.import.expired' }),
    );
  });

  test('approval cannot assert public rights, identity, or publication state', () => {
    const approval = {
      draftId: multiPagePhotoDraftFixture.id,
      expectedDraftVersion: 1,
      idempotencyKey: 'recipe-import:draft-photo:1',
      reviewedRecipe: familyRecipeFixture.recipe,
      reviewedVersion: familyRecipeFixture.version,
    };
    expect(parseRecipeImportApproval(approval).idempotencyKey).toBe('recipe-import:draft-photo:1');

    expect(() => parseRecipeImportApproval({
      ...approval,
      rightsAttestation: 'original',
    })).toThrow(expect.objectContaining<Partial<RecipeContractError>>({ code: 'recipe.import.approval_field.unknown' }));
  });

  test('approval is idempotent and produces one canonical identity', () => {
    const approval = parseRecipeImportApproval({
      draftId: multiPagePhotoDraftFixture.id,
      expectedDraftVersion: 1,
      idempotencyKey: 'recipe-import:draft-photo:1',
      reviewedRecipe: familyRecipeFixture.recipe,
      reviewedVersion: familyRecipeFixture.version,
    });
    const state = { receiptsByIdempotencyKey: new Map() };

    const first = approveRecipeImport(state, approval, { now: '2026-08-05T12:00:00.000Z' });
    const retry = approveRecipeImport(state, approval, { now: '2026-08-05T12:00:01.000Z' });

    expect(retry).toBe(first);
    expect(retry.recipeId).toBe(familyRecipeFixture.recipe.id);
    expect(state.receiptsByIdempotencyKey.size).toBe(1);
  });
});
