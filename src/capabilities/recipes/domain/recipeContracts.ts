import { parseRecipeEquipmentRequirements, type SpecializedRecipeEquipment } from './recipeEquipment';

export type RecipeLifecycle = 'active' | 'archived' | 'deleted';
export type RecipeRightsBasis =
  | 'user_authored'
  | 'private_user_import'
  | 'authorized'
  | 'licensed'
  | 'public_domain'
  | 'kwilt_authored';

export type RecipeProvenance = {
  id: string;
  method: 'manual' | 'url' | 'photo' | 'scan' | 'text' | 'voice' | 'email' | 'copy' | 'catalog';
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceAuthor: string | null;
  sourceContentHash: string | null;
  rightsBasis: RecipeRightsBasis;
  importedAt: string | null;
};

export type RecipeCredit = {
  id: string;
  role: 'author' | 'contributor' | 'family_source' | 'adapted_from' | 'imported_from';
  personId: string | null;
  publicProfileId: string | null;
  displayLabel: string | null;
  position: number;
  publicVisible: boolean;
};

export type RecipeLineage = {
  id: string;
  relationship: 'copy' | 'adaptation' | 'fork';
  sourceRecipeId: string | null;
  sourceRecipeVersionId: string;
  sourcePublicationId: string | null;
};

export type RecipeAccessGrant = {
  id: string;
  granteePersonId: string;
  role: 'viewer' | 'contributor' | 'maintainer';
  status: 'pending' | 'active' | 'revoked' | 'expired';
  grantedByPersonId: string;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

export type RecipeMediaAsset = {
  id: string;
  ownerPersonId: string;
  storageRef: string;
  mediaType: string;
  rightsBasis: RecipeRightsBasis;
  attribution: string | null;
  altText: string | null;
  publicAllowed: boolean;
  lifecycle: 'active' | 'deleted';
};

export type Recipe = {
  id: string;
  ownerPersonId: string;
  currentVersionId: string;
  lifecycle: RecipeLifecycle;
  provenance: RecipeProvenance;
  credits: RecipeCredit[];
  lineage: RecipeLineage[];
  accessGrants: RecipeAccessGrant[];
  mediaAssets: RecipeMediaAsset[];
  createdAt: string;
  updatedAt: string;
};

export type RecipeIngredientLine = {
  id: string;
  recipeVersionId: string;
  position: number;
  groupLabel: string | null;
  originalText: string;
  quantityMin: number | null;
  quantityMax: number | null;
  unit: string | null;
  ingredientConcept: string | null;
  preparation: string | null;
  optional: boolean;
  parseConfidence: number | null;
};

export type RecipeInstructionCue = {
  id: string;
  position: number;
  text: string;
  mediaAssetIds?: string[];
};

export type RecipeInstructionStep = {
  id: string;
  recipeVersionId: string;
  position: number;
  sectionLabel: string | null;
  text: string;
  mediaAssetIds?: string[];
  cues?: RecipeInstructionCue[];
};

export type RecipeVersion = {
  id: string;
  recipeId: string;
  version: number;
  title: string;
  description: string | null;
  yieldQuantity: number | null;
  yieldUnit: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  notes: string | null;
  ingredients: RecipeIngredientLine[];
  instructions: RecipeInstructionStep[];
  equipmentRequirements: SpecializedRecipeEquipment[];
  createdByPersonId: string;
  createdAt: string;
  contentHash: string;
};

export type RecipeContractErrorCode =
  | 'recipe.value.object_required'
  | 'recipe.field.unknown'
  | 'recipe.field.invalid'
  | 'recipe.lifecycle.invalid'
  | 'recipe.title.invalid'
  | 'recipe.ingredients.invalid'
  | 'recipe.ingredients.position_invalid'
  | 'recipe.instructions.invalid'
  | 'recipe.instructions.position_invalid'
  | 'recipe.ingredient.confidence_invalid'
  | 'recipe.media.public_rights_invalid'
  | 'recipe.import.approval_field.unknown'
  | 'recipe.import.confidence_invalid'
  | 'recipe.import.artifact_order_invalid'
  | 'recipe.import.expired'
  | 'recipe.publication.child_not_allowed'
  | 'recipe.publication.rights_required'
  | 'recipe.publication.media_rights_invalid'
  | 'recipe.publication.owner_required'
  | 'recipe.publication.confirmation_mismatch';

export class RecipeContractError extends Error {
  constructor(
    public readonly code: RecipeContractErrorCode,
    message: string,
    public readonly path: string,
  ) {
    super(message);
    this.name = 'RecipeContractError';
  }
}

type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown, path: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RecipeContractError('recipe.value.object_required', `${path} must be an object.`, path);
  }
  return value as UnknownRecord;
}

export function assertExactKeys(
  value: UnknownRecord,
  keys: readonly string[],
  path: string,
  code: RecipeContractErrorCode = 'recipe.field.unknown',
): void {
  const allowed = new Set(keys);
  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  if (unknown) throw new RecipeContractError(code, `${path}.${unknown} is not supported.`, `${path}.${unknown}`);
}

export function requiredString(value: unknown, path: string, maxLength = 512): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    throw new RecipeContractError('recipe.field.invalid', `${path} must be a non-empty string up to ${maxLength} characters.`, path);
  }
  return value;
}

export function nullableString(value: unknown, path: string, maxLength = 4_000): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new RecipeContractError('recipe.field.invalid', `${path} must be null or a string up to ${maxLength} characters.`, path);
  }
  return value;
}

export function isoDateString(value: unknown, path: string): string {
  const text = requiredString(value, path, 64);
  if (!Number.isFinite(Date.parse(text))) {
    throw new RecipeContractError('recipe.field.invalid', `${path} must be an ISO date.`, path);
  }
  return text;
}

function nullableIsoDate(value: unknown, path: string): string | null {
  return value === null ? null : isoDateString(value, path);
}

function enumValue<const T extends string>(value: unknown, values: readonly T[], path: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new RecipeContractError('recipe.field.invalid', `${path} has an unsupported value.`, path);
  }
  return value as T;
}

function finiteNumber(value: unknown, path: string, options: { min?: number; max?: number; integer?: boolean } = {}): number {
  if (typeof value !== 'number' || !Number.isFinite(value) ||
      (options.integer && !Number.isInteger(value)) ||
      (options.min !== undefined && value < options.min) ||
      (options.max !== undefined && value > options.max)) {
    throw new RecipeContractError('recipe.field.invalid', `${path} is outside its allowed numeric range.`, path);
  }
  return value;
}

function nullableNumber(value: unknown, path: string, options: { min?: number; max?: number; integer?: boolean } = {}): number | null {
  return value === null ? null : finiteNumber(value, path, options);
}

function optionalStringArray(value: unknown, path: string, limit: number): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > limit) {
    throw new RecipeContractError('recipe.field.invalid', `${path} must contain at most ${limit} values.`, path);
  }
  const result = value.map((item, index) => requiredString(item, `${path}[${index}]`, 128));
  if (new Set(result).size !== result.length) {
    throw new RecipeContractError('recipe.field.invalid', `${path} cannot contain duplicates.`, path);
  }
  return result;
}

function orderedPositions(values: readonly { position: number }[], code: RecipeContractErrorCode, path: string): void {
  if (values.some((value, index) => value.position !== index)) {
    throw new RecipeContractError(code, `${path} positions must be unique and contiguous from zero.`, path);
  }
}

function parseProvenance(value: unknown): RecipeProvenance {
  const object = asRecord(value, 'recipe.provenance');
  assertExactKeys(object, ['id', 'method', 'sourceUrl', 'sourceTitle', 'sourceAuthor', 'sourceContentHash', 'rightsBasis', 'importedAt'], 'recipe.provenance');
  return {
    id: requiredString(object.id, 'recipe.provenance.id', 128),
    method: enumValue(object.method, ['manual', 'url', 'photo', 'scan', 'text', 'voice', 'email', 'copy', 'catalog'], 'recipe.provenance.method'),
    sourceUrl: nullableString(object.sourceUrl, 'recipe.provenance.sourceUrl', 2_048),
    sourceTitle: nullableString(object.sourceTitle, 'recipe.provenance.sourceTitle', 512),
    sourceAuthor: nullableString(object.sourceAuthor, 'recipe.provenance.sourceAuthor', 512),
    sourceContentHash: nullableString(object.sourceContentHash, 'recipe.provenance.sourceContentHash', 256),
    rightsBasis: enumValue(object.rightsBasis, ['user_authored', 'private_user_import', 'authorized', 'licensed', 'public_domain', 'kwilt_authored'], 'recipe.provenance.rightsBasis'),
    importedAt: nullableIsoDate(object.importedAt, 'recipe.provenance.importedAt'),
  };
}

function parseCredit(value: unknown, index: number): RecipeCredit {
  const path = `recipe.credits[${index}]`;
  const object = asRecord(value, path);
  assertExactKeys(object, ['id', 'role', 'personId', 'publicProfileId', 'displayLabel', 'position', 'publicVisible'], path);
  return {
    id: requiredString(object.id, `${path}.id`, 128),
    role: enumValue(object.role, ['author', 'contributor', 'family_source', 'adapted_from', 'imported_from'], `${path}.role`),
    personId: nullableString(object.personId, `${path}.personId`, 128),
    publicProfileId: nullableString(object.publicProfileId, `${path}.publicProfileId`, 128),
    displayLabel: nullableString(object.displayLabel, `${path}.displayLabel`, 320),
    position: finiteNumber(object.position, `${path}.position`, { min: 0, integer: true }),
    publicVisible: object.publicVisible === true,
  };
}

function parseLineage(value: unknown, index: number): RecipeLineage {
  const path = `recipe.lineage[${index}]`;
  const object = asRecord(value, path);
  assertExactKeys(object, ['id', 'relationship', 'sourceRecipeId', 'sourceRecipeVersionId', 'sourcePublicationId'], path);
  return {
    id: requiredString(object.id, `${path}.id`, 128),
    relationship: enumValue(object.relationship, ['copy', 'adaptation', 'fork'], `${path}.relationship`),
    sourceRecipeId: nullableString(object.sourceRecipeId, `${path}.sourceRecipeId`, 128),
    sourceRecipeVersionId: requiredString(object.sourceRecipeVersionId, `${path}.sourceRecipeVersionId`, 128),
    sourcePublicationId: nullableString(object.sourcePublicationId, `${path}.sourcePublicationId`, 128),
  };
}

function parseGrant(value: unknown, index: number): RecipeAccessGrant {
  const path = `recipe.accessGrants[${index}]`;
  const object = asRecord(value, path);
  assertExactKeys(object, ['id', 'granteePersonId', 'role', 'status', 'grantedByPersonId', 'expiresAt', 'createdAt', 'revokedAt'], path);
  return {
    id: requiredString(object.id, `${path}.id`, 128),
    granteePersonId: requiredString(object.granteePersonId, `${path}.granteePersonId`, 128),
    role: enumValue(object.role, ['viewer', 'contributor', 'maintainer'], `${path}.role`),
    status: enumValue(object.status, ['pending', 'active', 'revoked', 'expired'], `${path}.status`),
    grantedByPersonId: requiredString(object.grantedByPersonId, `${path}.grantedByPersonId`, 128),
    expiresAt: nullableIsoDate(object.expiresAt, `${path}.expiresAt`),
    createdAt: isoDateString(object.createdAt, `${path}.createdAt`),
    revokedAt: nullableIsoDate(object.revokedAt, `${path}.revokedAt`),
  };
}

function parseMedia(value: unknown, index: number): RecipeMediaAsset {
  const path = `recipe.mediaAssets[${index}]`;
  const object = asRecord(value, path);
  assertExactKeys(object, ['id', 'ownerPersonId', 'storageRef', 'mediaType', 'rightsBasis', 'attribution', 'altText', 'publicAllowed', 'lifecycle'], path);
  const rightsBasis = enumValue(object.rightsBasis, ['user_authored', 'private_user_import', 'authorized', 'licensed', 'public_domain', 'kwilt_authored'], `${path}.rightsBasis`);
  const publicAllowed = object.publicAllowed === true;
  if (publicAllowed && rightsBasis === 'private_user_import') {
    throw new RecipeContractError('recipe.media.public_rights_invalid', 'Private imports cannot be marked public without a separate public rights basis.', `${path}.publicAllowed`);
  }
  return {
    id: requiredString(object.id, `${path}.id`, 128),
    ownerPersonId: requiredString(object.ownerPersonId, `${path}.ownerPersonId`, 128),
    storageRef: requiredString(object.storageRef, `${path}.storageRef`, 1_024),
    mediaType: requiredString(object.mediaType, `${path}.mediaType`, 128),
    rightsBasis,
    attribution: nullableString(object.attribution, `${path}.attribution`, 1_000),
    altText: nullableString(object.altText, `${path}.altText`, 1_000),
    publicAllowed,
    lifecycle: enumValue(object.lifecycle, ['active', 'deleted'], `${path}.lifecycle`),
  };
}

export function parseRecipe(value: unknown): Recipe {
  const object = asRecord(value, 'recipe');
  assertExactKeys(object, ['id', 'ownerPersonId', 'currentVersionId', 'lifecycle', 'provenance', 'credits', 'lineage', 'accessGrants', 'mediaAssets', 'createdAt', 'updatedAt'], 'recipe');
  if (!['active', 'archived', 'deleted'].includes(String(object.lifecycle))) {
    throw new RecipeContractError('recipe.lifecycle.invalid', 'Recipe lifecycle must remain private aggregate state.', 'recipe.lifecycle');
  }
  if (!Array.isArray(object.credits) || !Array.isArray(object.lineage) ||
      !Array.isArray(object.accessGrants) || !Array.isArray(object.mediaAssets)) {
    throw new RecipeContractError('recipe.field.invalid', 'Recipe child records must be arrays.', 'recipe');
  }
  if (object.credits.length > 50 || object.lineage.length > 20 || object.accessGrants.length > 100 || object.mediaAssets.length > 20) {
    throw new RecipeContractError('recipe.field.invalid', 'Recipe child record limit exceeded.', 'recipe');
  }
  const credits = object.credits.map(parseCredit);
  orderedPositions(credits, 'recipe.field.invalid', 'recipe.credits');
  return {
    id: requiredString(object.id, 'recipe.id', 128),
    ownerPersonId: requiredString(object.ownerPersonId, 'recipe.ownerPersonId', 128),
    currentVersionId: requiredString(object.currentVersionId, 'recipe.currentVersionId', 128),
    lifecycle: object.lifecycle as RecipeLifecycle,
    provenance: parseProvenance(object.provenance),
    credits,
    lineage: object.lineage.map(parseLineage),
    accessGrants: object.accessGrants.map(parseGrant),
    mediaAssets: object.mediaAssets.map(parseMedia),
    createdAt: isoDateString(object.createdAt, 'recipe.createdAt'),
    updatedAt: isoDateString(object.updatedAt, 'recipe.updatedAt'),
  };
}

function parseIngredient(value: unknown, index: number): RecipeIngredientLine {
  const path = `recipeVersion.ingredients[${index}]`;
  const object = asRecord(value, path);
  assertExactKeys(object, ['id', 'recipeVersionId', 'position', 'groupLabel', 'originalText', 'quantityMin', 'quantityMax', 'unit', 'ingredientConcept', 'preparation', 'optional', 'parseConfidence'], path);
  if (object.parseConfidence !== null && (typeof object.parseConfidence !== 'number' || object.parseConfidence < 0 || object.parseConfidence > 1)) {
    throw new RecipeContractError('recipe.ingredient.confidence_invalid', 'Ingredient confidence must be between zero and one.', `${path}.parseConfidence`);
  }
  const confidence = object.parseConfidence as number | null;
  return {
    id: requiredString(object.id, `${path}.id`, 128),
    recipeVersionId: requiredString(object.recipeVersionId, `${path}.recipeVersionId`, 128),
    position: finiteNumber(object.position, `${path}.position`, { min: 0, integer: true }),
    groupLabel: nullableString(object.groupLabel, `${path}.groupLabel`, 160),
    originalText: requiredString(object.originalText, `${path}.originalText`, 1_000),
    quantityMin: nullableNumber(object.quantityMin, `${path}.quantityMin`, { min: 0 }),
    quantityMax: nullableNumber(object.quantityMax, `${path}.quantityMax`, { min: 0 }),
    unit: nullableString(object.unit, `${path}.unit`, 80),
    ingredientConcept: nullableString(object.ingredientConcept, `${path}.ingredientConcept`, 320),
    preparation: nullableString(object.preparation, `${path}.preparation`, 320),
    optional: object.optional === true,
    parseConfidence: confidence,
  };
}

function parseInstruction(value: unknown, index: number): RecipeInstructionStep {
  const path = `recipeVersion.instructions[${index}]`;
  const object = asRecord(value, path);
  assertExactKeys(object, ['id', 'recipeVersionId', 'position', 'sectionLabel', 'text', 'mediaAssetIds', 'cues'], path);
  if (object.cues !== undefined && (!Array.isArray(object.cues) || object.cues.length > 100)) {
    throw new RecipeContractError('recipe.instructions.invalid', `${path}.cues must contain at most 100 cues.`, `${path}.cues`);
  }
  const cues = object.cues === undefined
    ? undefined
    : (object.cues as unknown[]).map((value, cueIndex) => {
      const cuePath = `${path}.cues[${cueIndex}]`;
      const cue = asRecord(value, cuePath);
      assertExactKeys(cue, ['id', 'position', 'text', 'mediaAssetIds'], cuePath);
      return {
        id: requiredString(cue.id, `${cuePath}.id`, 128),
        position: finiteNumber(cue.position, `${cuePath}.position`, { min: 0, integer: true }),
        text: requiredString(cue.text, `${cuePath}.text`, 8_000),
        ...(cue.mediaAssetIds === undefined
          ? {}
          : { mediaAssetIds: optionalStringArray(cue.mediaAssetIds, `${cuePath}.mediaAssetIds`, 10) }),
      };
    });
  if (cues) orderedPositions(cues, 'recipe.instructions.position_invalid', `${path}.cues`);
  return {
    id: requiredString(object.id, `${path}.id`, 128),
    recipeVersionId: requiredString(object.recipeVersionId, `${path}.recipeVersionId`, 128),
    position: finiteNumber(object.position, `${path}.position`, { min: 0, integer: true }),
    sectionLabel: nullableString(object.sectionLabel, `${path}.sectionLabel`, 160),
    text: requiredString(object.text, `${path}.text`, 8_000),
    ...(object.mediaAssetIds === undefined
      ? {}
      : { mediaAssetIds: optionalStringArray(object.mediaAssetIds, `${path}.mediaAssetIds`, 10) }),
    ...(cues === undefined ? {} : { cues }),
  };
}

export function parseRecipeVersion(value: unknown): RecipeVersion {
  const object = asRecord(value, 'recipeVersion');
  assertExactKeys(object, ['id', 'recipeId', 'version', 'title', 'description', 'yieldQuantity', 'yieldUnit', 'prepMinutes', 'cookMinutes', 'notes', 'ingredients', 'instructions', 'equipmentRequirements', 'createdByPersonId', 'createdAt', 'contentHash'], 'recipeVersion');
  if (typeof object.title !== 'string' || object.title.trim().length === 0 || object.title.length > 160) {
    throw new RecipeContractError('recipe.title.invalid', 'Recipe title must be between 1 and 160 characters.', 'recipeVersion.title');
  }
  if (!Array.isArray(object.ingredients) || object.ingredients.length > 200) {
    throw new RecipeContractError('recipe.ingredients.invalid', 'Recipe ingredients must contain at most 200 lines.', 'recipeVersion.ingredients');
  }
  if (!Array.isArray(object.instructions) || object.instructions.length > 200) {
    throw new RecipeContractError('recipe.instructions.invalid', 'Recipe instructions must contain at most 200 steps.', 'recipeVersion.instructions');
  }
  const ingredients = object.ingredients.map(parseIngredient);
  const instructions = object.instructions.map(parseInstruction);
  const equipmentRequirements = parseRecipeEquipmentRequirements(
    object.equipmentRequirements,
    instructions.map((step) => step.text),
  );
  orderedPositions(ingredients, 'recipe.ingredients.position_invalid', 'recipeVersion.ingredients');
  orderedPositions(instructions, 'recipe.instructions.position_invalid', 'recipeVersion.instructions');
  const id = requiredString(object.id, 'recipeVersion.id', 128);
  if (ingredients.some((line) => line.recipeVersionId !== id) || instructions.some((step) => step.recipeVersionId !== id)) {
    throw new RecipeContractError('recipe.field.invalid', 'Child rows must reference the parsed Recipe version.', 'recipeVersion');
  }
  return {
    id,
    recipeId: requiredString(object.recipeId, 'recipeVersion.recipeId', 128),
    version: finiteNumber(object.version, 'recipeVersion.version', { min: 1, integer: true }),
    title: object.title,
    description: nullableString(object.description, 'recipeVersion.description', 4_000),
    yieldQuantity: nullableNumber(object.yieldQuantity, 'recipeVersion.yieldQuantity', { min: 0 }),
    yieldUnit: nullableString(object.yieldUnit, 'recipeVersion.yieldUnit', 80),
    prepMinutes: nullableNumber(object.prepMinutes, 'recipeVersion.prepMinutes', { min: 0, max: 100_000, integer: true }),
    cookMinutes: nullableNumber(object.cookMinutes, 'recipeVersion.cookMinutes', { min: 0, max: 100_000, integer: true }),
    notes: nullableString(object.notes, 'recipeVersion.notes', 20_000),
    ingredients,
    instructions,
    equipmentRequirements,
    createdByPersonId: requiredString(object.createdByPersonId, 'recipeVersion.createdByPersonId', 128),
    createdAt: isoDateString(object.createdAt, 'recipeVersion.createdAt'),
    contentHash: requiredString(object.contentHash, 'recipeVersion.contentHash', 256),
  };
}
