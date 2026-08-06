import { collaboratedRecipeFixture, familyRecipeFixture, independentCopyFixture } from './recipeContractFixtures';
import { RecipeContractError, parseRecipe } from './recipeContracts';
import {
  canReadPrivateRecipe,
  parsePublicCreatorProfile,
  parseRecipePublication,
  publishRecipeVersion,
  replacePublishedVersion,
  type PublicCreatorProfile,
  type RecipePublication,
} from './recipePublicationContracts';

const publicProfile: PublicCreatorProfile = {
  id: 'creator-maya',
  ownerPersonId: 'person-owner',
  publicName: 'Maya Makes Dinner',
  avatarMediaAssetId: null,
  bio: 'Family recipes worth keeping.',
  accountClass: 'adult',
  status: 'active',
  createdAt: '2026-08-05T12:00:00.000Z',
  updatedAt: '2026-08-05T12:00:00.000Z',
};

const publication: RecipePublication = {
  id: 'publication-cake',
  recipeId: familyRecipeFixture.recipe.id,
  publishedRecipeVersionId: familyRecipeFixture.version.id,
  publicSlug: 'grandma-ruth-cake',
  publisherPublicProfileId: publicProfile.id,
  state: 'draft',
  distributionScopes: ['kwilt_mobile'],
  rightsAttestation: 'authorized',
  license: null,
  attributionSnapshot: [{ role: 'family_source', displayLabel: 'Grandma Ruth' }],
  mediaAssetIds: [],
  publishedAt: null,
  withdrawnAt: null,
};

describe('Recipe publication contracts', () => {
  test('keeps private, copy, collaboration, unlisted, catalog, and public-web states distinct', () => {
    const privateRecipe = parseRecipe(familyRecipeFixture.recipe);
    const copy = parseRecipe(independentCopyFixture.recipe);
    const collaboration = parseRecipe(collaboratedRecipeFixture.recipe);

    expect(canReadPrivateRecipe(privateRecipe, 'person-owner')).toBe(true);
    expect(canReadPrivateRecipe(privateRecipe, 'person-helper')).toBe(false);
    expect(copy.lineage[0].relationship).toBe('adaptation');
    expect(canReadPrivateRecipe(collaboration, 'person-helper')).toBe(true);

    expect(parseRecipePublication({ ...publication, state: 'unlisted' }).state).toBe('unlisted');
    expect(parseRecipePublication({ ...publication, state: 'published' }).state).toBe('published');
    expect(parseRecipePublication({
      ...publication,
      state: 'published',
      distributionScopes: ['kwilt_mobile', 'kwilt_desktop', 'kwilt_web', 'public_web'],
    }).distributionScopes).toContain('public_web');
  });

  test('collection membership alone cannot grant access to a private Recipe', () => {
    const recipe = parseRecipe(familyRecipeFixture.recipe);
    const collectionMemberPersonIds = ['person-collection-member'];

    expect(collectionMemberPersonIds).toContain('person-collection-member');
    expect(canReadPrivateRecipe(recipe, 'person-collection-member')).toBe(false);
  });

  test('public identity is explicit and cannot be inferred from private account fields', () => {
    expect(parsePublicCreatorProfile(publicProfile).publicName).toBe('Maya Makes Dinner');
    expect(() => parsePublicCreatorProfile({ ...publicProfile, privateAccountName: 'Maya Watanabe' })).toThrow(
      expect.objectContaining<Partial<RecipeContractError>>({ code: 'recipe.field.unknown' }),
    );
    expect(() => parsePublicCreatorProfile({ ...publicProfile, accountClass: 'child' })).toThrow(
      expect.objectContaining<Partial<RecipeContractError>>({ code: 'recipe.publication.child_not_allowed' }),
    );
  });

  test('publication pins an immutable version and public-approved media', () => {
    expect(parseRecipePublication(publication).publishedRecipeVersionId).toBe(familyRecipeFixture.version.id);

    expect(() => publishRecipeVersion({
      actorPersonId: 'person-owner',
      recipe: familyRecipeFixture.recipe,
      profile: publicProfile,
      publication: { ...publication, mediaAssetIds: ['media-card-front'] },
      confirmedVersionId: familyRecipeFixture.version.id,
      confirmedScopes: ['kwilt_mobile'],
      now: '2026-08-05T12:30:00.000Z',
    })).toThrow(expect.objectContaining<Partial<RecipeContractError>>({ code: 'recipe.publication.media_rights_invalid' }));
  });

  test('requires owner authority, rights attestation, exact version, and confirmed scopes', () => {
    expect(() => publishRecipeVersion({
      actorPersonId: 'person-helper',
      recipe: parseRecipe(collaboratedRecipeFixture.recipe),
      profile: publicProfile,
      publication,
      confirmedVersionId: familyRecipeFixture.version.id,
      confirmedScopes: ['kwilt_mobile'],
      now: '2026-08-05T12:30:00.000Z',
    })).toThrow(expect.objectContaining<Partial<RecipeContractError>>({ code: 'recipe.publication.owner_required' }));

    expect(() => parseRecipePublication({ ...publication, rightsAttestation: null })).toThrow(
      expect.objectContaining<Partial<RecipeContractError>>({ code: 'recipe.publication.rights_required' }),
    );

    expect(() => publishRecipeVersion({
      actorPersonId: 'person-owner',
      recipe: familyRecipeFixture.recipe,
      profile: publicProfile,
      publication,
      confirmedVersionId: 'rv-wrong',
      confirmedScopes: ['kwilt_mobile'],
      now: '2026-08-05T12:30:00.000Z',
    })).toThrow(expect.objectContaining<Partial<RecipeContractError>>({ code: 'recipe.publication.confirmation_mismatch' }));

    expect(() => publishRecipeVersion({
      actorPersonId: 'person-owner',
      recipe: familyRecipeFixture.recipe,
      profile: publicProfile,
      publication: { ...publication, distributionScopes: ['kwilt_mobile', 'public_web'] },
      confirmedVersionId: familyRecipeFixture.version.id,
      confirmedScopes: ['kwilt_mobile'],
      now: '2026-08-05T12:30:00.000Z',
    })).toThrow(expect.objectContaining<Partial<RecipeContractError>>({ code: 'recipe.publication.confirmation_mismatch' }));
  });

  test('private edits never republish without a new version review', () => {
    const published = publishRecipeVersion({
      actorPersonId: 'person-owner',
      recipe: familyRecipeFixture.recipe,
      profile: publicProfile,
      publication,
      confirmedVersionId: familyRecipeFixture.version.id,
      confirmedScopes: ['kwilt_mobile'],
      now: '2026-08-05T12:30:00.000Z',
    });
    const editedRecipe = { ...familyRecipeFixture.recipe, currentVersionId: 'rv-family-cake-2' };

    expect(published.publishedRecipeVersionId).toBe('rv-family-cake-1');
    expect(() => replacePublishedVersion({
      actorPersonId: 'person-owner',
      recipe: editedRecipe,
      publication: published,
      nextVersionId: 'rv-family-cake-2',
      confirmedVersionId: 'rv-family-cake-1',
      now: '2026-08-05T13:00:00.000Z',
    })).toThrow(expect.objectContaining<Partial<RecipeContractError>>({ code: 'recipe.publication.confirmation_mismatch' }));
  });
});
