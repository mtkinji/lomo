import {
  RecipeContractError,
  asRecord,
  assertExactKeys,
  isoDateString,
  nullableString,
  requiredString,
  type Recipe,
} from './recipeContracts';

export type PublicCreatorProfile = {
  id: string;
  ownerPersonId: string;
  publicName: string;
  avatarMediaAssetId: string | null;
  bio: string | null;
  accountClass: 'adult';
  status: 'active' | 'disabled' | 'deleted';
  createdAt: string;
  updatedAt: string;
};

export type RecipeDistributionScope =
  | 'kwilt_mobile'
  | 'kwilt_desktop'
  | 'kwilt_web'
  | 'public_web';

export type RecipePublication = {
  id: string;
  recipeId: string;
  publishedRecipeVersionId: string;
  publicSlug: string;
  publisherPublicProfileId: string;
  state: 'draft' | 'unlisted' | 'published' | 'withdrawn' | 'moderated';
  distributionScopes: RecipeDistributionScope[];
  rightsAttestation: 'original' | 'authorized' | 'licensed' | 'public_domain';
  license: string | null;
  attributionSnapshot: Array<{ role: string; displayLabel: string }>;
  mediaAssetIds: string[];
  publishedAt: string | null;
  withdrawnAt: string | null;
};

type PublicationErrorCode =
  | 'recipe.publication.child_not_allowed'
  | 'recipe.publication.rights_required'
  | 'recipe.publication.media_rights_invalid'
  | 'recipe.publication.owner_required'
  | 'recipe.publication.confirmation_mismatch';

function publicationError(code: PublicationErrorCode, message: string, path: string): never {
  throw new RecipeContractError(code, message, path);
}

function exactStringArray(value: unknown, path: string, limit: number): string[] {
  if (!Array.isArray(value) || value.length > limit || value.some((item) => typeof item !== 'string' || !item)) {
    throw new RecipeContractError('recipe.field.invalid', `${path} must be a bounded string array.`, path);
  }
  if (new Set(value).size !== value.length) {
    throw new RecipeContractError('recipe.field.invalid', `${path} cannot contain duplicates.`, path);
  }
  return [...value];
}

export function canReadPrivateRecipe(recipe: Recipe, actorPersonId: string): boolean {
  if (actorPersonId === recipe.ownerPersonId) return true;
  return recipe.accessGrants.some((grant) => (
    grant.granteePersonId === actorPersonId && grant.status === 'active'
  ));
}

export function parsePublicCreatorProfile(value: unknown): PublicCreatorProfile {
  const object = asRecord(value, 'publicCreatorProfile');
  assertExactKeys(object, ['id', 'ownerPersonId', 'publicName', 'avatarMediaAssetId', 'bio', 'accountClass', 'status', 'createdAt', 'updatedAt'], 'publicCreatorProfile');
  if (object.accountClass !== 'adult') {
    publicationError('recipe.publication.child_not_allowed', 'Child accounts cannot publish under the initial policy.', 'publicCreatorProfile.accountClass');
  }
  if (!['active', 'disabled', 'deleted'].includes(String(object.status))) {
    throw new RecipeContractError('recipe.field.invalid', 'Unsupported public creator profile status.', 'publicCreatorProfile.status');
  }
  return {
    id: requiredString(object.id, 'publicCreatorProfile.id', 128),
    ownerPersonId: requiredString(object.ownerPersonId, 'publicCreatorProfile.ownerPersonId', 128),
    publicName: requiredString(object.publicName, 'publicCreatorProfile.publicName', 160),
    avatarMediaAssetId: nullableString(object.avatarMediaAssetId, 'publicCreatorProfile.avatarMediaAssetId', 128),
    bio: nullableString(object.bio, 'publicCreatorProfile.bio', 1_000),
    accountClass: 'adult',
    status: object.status as PublicCreatorProfile['status'],
    createdAt: isoDateString(object.createdAt, 'publicCreatorProfile.createdAt'),
    updatedAt: isoDateString(object.updatedAt, 'publicCreatorProfile.updatedAt'),
  };
}

function parseAttributionSnapshot(value: unknown): RecipePublication['attributionSnapshot'] {
  if (!Array.isArray(value) || value.length > 50) {
    throw new RecipeContractError('recipe.field.invalid', 'Publication attribution must be a bounded array.', 'recipePublication.attributionSnapshot');
  }
  return value.map((entry, index) => {
    const path = `recipePublication.attributionSnapshot[${index}]`;
    const object = asRecord(entry, path);
    assertExactKeys(object, ['role', 'displayLabel'], path);
    return {
      role: requiredString(object.role, `${path}.role`, 80),
      displayLabel: requiredString(object.displayLabel, `${path}.displayLabel`, 320),
    };
  });
}

export function parseRecipePublication(value: unknown): RecipePublication {
  const object = asRecord(value, 'recipePublication');
  assertExactKeys(object, ['id', 'recipeId', 'publishedRecipeVersionId', 'publicSlug', 'publisherPublicProfileId', 'state', 'distributionScopes', 'rightsAttestation', 'license', 'attributionSnapshot', 'mediaAssetIds', 'publishedAt', 'withdrawnAt'], 'recipePublication');
  if (!['draft', 'unlisted', 'published', 'withdrawn', 'moderated'].includes(String(object.state))) {
    throw new RecipeContractError('recipe.field.invalid', 'Unsupported Recipe publication state.', 'recipePublication.state');
  }
  if (!['original', 'authorized', 'licensed', 'public_domain'].includes(String(object.rightsAttestation))) {
    publicationError('recipe.publication.rights_required', 'A supported rights attestation is required.', 'recipePublication.rightsAttestation');
  }
  const distributionScopes = exactStringArray(object.distributionScopes, 'recipePublication.distributionScopes', 4);
  if (distributionScopes.some((scope) => !['kwilt_mobile', 'kwilt_desktop', 'kwilt_web', 'public_web'].includes(scope))) {
    throw new RecipeContractError('recipe.field.invalid', 'Unsupported Recipe distribution scope.', 'recipePublication.distributionScopes');
  }
  const publishedAt = object.publishedAt === null ? null : isoDateString(object.publishedAt, 'recipePublication.publishedAt');
  const withdrawnAt = object.withdrawnAt === null ? null : isoDateString(object.withdrawnAt, 'recipePublication.withdrawnAt');
  return {
    id: requiredString(object.id, 'recipePublication.id', 128),
    recipeId: requiredString(object.recipeId, 'recipePublication.recipeId', 128),
    publishedRecipeVersionId: requiredString(object.publishedRecipeVersionId, 'recipePublication.publishedRecipeVersionId', 128),
    publicSlug: requiredString(object.publicSlug, 'recipePublication.publicSlug', 160),
    publisherPublicProfileId: requiredString(object.publisherPublicProfileId, 'recipePublication.publisherPublicProfileId', 128),
    state: object.state as RecipePublication['state'],
    distributionScopes: distributionScopes as RecipeDistributionScope[],
    rightsAttestation: object.rightsAttestation as RecipePublication['rightsAttestation'],
    license: nullableString(object.license, 'recipePublication.license', 320),
    attributionSnapshot: parseAttributionSnapshot(object.attributionSnapshot),
    mediaAssetIds: exactStringArray(object.mediaAssetIds, 'recipePublication.mediaAssetIds', 20),
    publishedAt,
    withdrawnAt,
  };
}

function sameOrderedValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function publishRecipeVersion(input: {
  actorPersonId: string;
  recipe: Recipe;
  profile: PublicCreatorProfile;
  publication: RecipePublication;
  confirmedVersionId: string;
  confirmedScopes: RecipeDistributionScope[];
  now: string;
}): RecipePublication {
  const recipe = input.recipe;
  const profile = parsePublicCreatorProfile(input.profile);
  const publication = parseRecipePublication(input.publication);
  if (input.actorPersonId !== recipe.ownerPersonId || input.actorPersonId !== profile.ownerPersonId ||
      profile.status !== 'active' || publication.recipeId !== recipe.id ||
      publication.publisherPublicProfileId !== profile.id) {
    publicationError('recipe.publication.owner_required', 'Only the Recipe owner using their active public profile may publish.', 'recipePublication');
  }
  if (publication.publishedRecipeVersionId !== input.confirmedVersionId ||
      !sameOrderedValues(publication.distributionScopes, input.confirmedScopes)) {
    publicationError('recipe.publication.confirmation_mismatch', 'The confirmed version and distribution scopes must match the reviewed publication.', 'recipePublication');
  }
  const mediaById = new Map(recipe.mediaAssets.map((asset) => [asset.id, asset]));
  if (publication.mediaAssetIds.some((id) => !mediaById.get(id)?.publicAllowed)) {
    publicationError('recipe.publication.media_rights_invalid', 'Every published media asset must have an explicit public rights basis.', 'recipePublication.mediaAssetIds');
  }
  return {
    ...publication,
    state: 'published',
    publishedAt: isoDateString(input.now, 'recipePublication.publishedAt'),
    withdrawnAt: null,
  };
}

export function replacePublishedVersion(input: {
  actorPersonId: string;
  recipe: Recipe;
  publication: RecipePublication;
  nextVersionId: string;
  confirmedVersionId: string;
  now: string;
}): RecipePublication {
  if (input.actorPersonId !== input.recipe.ownerPersonId) {
    publicationError('recipe.publication.owner_required', 'Only the Recipe owner may replace a published version.', 'recipePublication');
  }
  if (input.nextVersionId !== input.recipe.currentVersionId || input.confirmedVersionId !== input.nextVersionId) {
    publicationError('recipe.publication.confirmation_mismatch', 'Republishing requires confirmation of the exact current Recipe version.', 'recipePublication.publishedRecipeVersionId');
  }
  return {
    ...parseRecipePublication(input.publication),
    publishedRecipeVersionId: input.nextVersionId,
    state: 'published',
    publishedAt: isoDateString(input.now, 'recipePublication.publishedAt'),
    withdrawnAt: null,
  };
}
