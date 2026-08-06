import {
  RecipeContractError,
  asRecord,
  assertExactKeys,
  nullableString,
  requiredString,
  type RecipeRightsBasis,
} from './recipeContracts';

export type ReviewedRecipeIngredient = {
  id: string;
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

export type ReviewedRecipeInstruction = {
  id: string;
  sectionLabel: string | null;
  text: string;
};

export type ReviewedRecipeCredit = {
  id: string;
  role: 'author' | 'contributor' | 'family_source' | 'adapted_from' | 'imported_from';
  personId: string | null;
  publicProfileId: string | null;
  displayLabel: string | null;
  position: number;
  publicVisible: boolean;
};

export type ReviewedRecipeLineage = {
  id: string;
  relationship: 'copy' | 'adaptation' | 'fork';
  sourceRecipeId: string | null;
  sourceRecipeVersionId: string;
  sourcePublicationId: string | null;
};

export type ReviewedRecipeData = {
  title: string;
  description: string | null;
  yieldQuantity: number | null;
  yieldUnit: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  notes: string | null;
  ingredients: ReviewedRecipeIngredient[];
  instructions: ReviewedRecipeInstruction[];
  provenance: {
    method: 'manual' | 'url' | 'photo' | 'scan' | 'text' | 'voice' | 'email' | 'copy' | 'catalog';
    sourceUrl: string | null;
    sourceTitle: string | null;
    sourceAuthor: string | null;
    sourceContentHash: string | null;
    rightsBasis: RecipeRightsBasis;
  };
  credits: ReviewedRecipeCredit[];
  lineage: ReviewedRecipeLineage[];
};

function nullableFiniteNumber(value: unknown, path: string, options: { integer?: boolean; max?: number } = {}): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 ||
      (options.integer && !Number.isInteger(value)) ||
      (options.max !== undefined && value > options.max)) {
    throw new RecipeContractError('recipe.field.invalid', `${path} is outside its allowed numeric range.`, path);
  }
  return value;
}

function optionalArray(value: unknown, path: string, max: number): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max) {
    throw new RecipeContractError('recipe.field.invalid', `${path} must contain at most ${max} entries.`, path);
  }
  return value;
}

export function parseReviewedRecipeData(value: unknown): ReviewedRecipeData {
  const object = asRecord(value, 'reviewedRecipe');
  assertExactKeys(object, [
    'title', 'description', 'yieldQuantity', 'yieldUnit', 'prepMinutes', 'cookMinutes',
    'notes', 'ingredients', 'instructions', 'provenance', 'credits', 'lineage',
  ], 'reviewedRecipe');

  const ingredients = optionalArray(object.ingredients, 'reviewedRecipe.ingredients', 200).map((entry, index) => {
    const path = `reviewedRecipe.ingredients[${index}]`;
    const line = asRecord(entry, path);
    assertExactKeys(line, [
      'id', 'groupLabel', 'originalText', 'quantityMin', 'quantityMax', 'unit',
      'ingredientConcept', 'preparation', 'optional', 'parseConfidence',
    ], path);
    const confidence = nullableFiniteNumber(line.parseConfidence, `${path}.parseConfidence`);
    if (confidence !== null && confidence > 1) {
      throw new RecipeContractError('recipe.import.confidence_invalid', `${path}.parseConfidence must be between zero and one.`, `${path}.parseConfidence`);
    }
    return {
      id: requiredString(line.id, `${path}.id`, 128),
      groupLabel: nullableString(line.groupLabel, `${path}.groupLabel`, 160),
      originalText: requiredString(line.originalText, `${path}.originalText`, 1_000),
      quantityMin: nullableFiniteNumber(line.quantityMin, `${path}.quantityMin`),
      quantityMax: nullableFiniteNumber(line.quantityMax, `${path}.quantityMax`),
      unit: nullableString(line.unit, `${path}.unit`, 80),
      ingredientConcept: nullableString(line.ingredientConcept, `${path}.ingredientConcept`, 320),
      preparation: nullableString(line.preparation, `${path}.preparation`, 320),
      optional: line.optional === true,
      parseConfidence: confidence,
    };
  });

  const instructions = optionalArray(object.instructions, 'reviewedRecipe.instructions', 200).map((entry, index) => {
    const path = `reviewedRecipe.instructions[${index}]`;
    const step = asRecord(entry, path);
    assertExactKeys(step, ['id', 'sectionLabel', 'text'], path);
    return {
      id: requiredString(step.id, `${path}.id`, 128),
      sectionLabel: nullableString(step.sectionLabel, `${path}.sectionLabel`, 160),
      text: requiredString(step.text, `${path}.text`, 8_000),
    };
  });

  const provenance = asRecord(object.provenance ?? {
    method: 'manual', sourceUrl: null, sourceTitle: null, sourceAuthor: null,
    sourceContentHash: null, rightsBasis: 'user_authored',
  }, 'reviewedRecipe.provenance');
  assertExactKeys(provenance, [
    'method', 'sourceUrl', 'sourceTitle', 'sourceAuthor', 'sourceContentHash', 'rightsBasis',
  ], 'reviewedRecipe.provenance');
  const methods = ['manual', 'url', 'photo', 'scan', 'text', 'voice', 'email', 'copy', 'catalog'] as const;
  const rights = ['user_authored', 'private_user_import', 'authorized', 'licensed', 'public_domain', 'kwilt_authored'] as const;
  if (!methods.includes(provenance.method as typeof methods[number]) ||
      !rights.includes(provenance.rightsBasis as typeof rights[number])) {
    throw new RecipeContractError('recipe.field.invalid', 'reviewedRecipe.provenance contains an unsupported value.', 'reviewedRecipe.provenance');
  }

  const creditRoles = ['author', 'contributor', 'family_source', 'adapted_from', 'imported_from'] as const;
  const credits = optionalArray(object.credits, 'reviewedRecipe.credits', 50).map((entry, index) => {
    const path = `reviewedRecipe.credits[${index}]`; const credit = asRecord(entry, path);
    assertExactKeys(credit, ['id','role','personId','publicProfileId','displayLabel','position','publicVisible'], path);
    if (!creditRoles.includes(credit.role as typeof creditRoles[number]) || credit.position !== index) throw new RecipeContractError('recipe.field.invalid', `${path} is invalid.`, path);
    return { id: requiredString(credit.id, `${path}.id`, 128), role: credit.role as ReviewedRecipeCredit['role'], personId: nullableString(credit.personId, `${path}.personId`, 128), publicProfileId: nullableString(credit.publicProfileId, `${path}.publicProfileId`, 128), displayLabel: nullableString(credit.displayLabel, `${path}.displayLabel`, 320), position: index, publicVisible: credit.publicVisible === true };
  });
  const relationships = ['copy', 'adaptation', 'fork'] as const;
  const lineage = optionalArray(object.lineage, 'reviewedRecipe.lineage', 20).map((entry, index) => {
    const path = `reviewedRecipe.lineage[${index}]`; const row = asRecord(entry, path);
    assertExactKeys(row, ['id','relationship','sourceRecipeId','sourceRecipeVersionId','sourcePublicationId'], path);
    if (!relationships.includes(row.relationship as typeof relationships[number])) throw new RecipeContractError('recipe.field.invalid', `${path}.relationship is invalid.`, `${path}.relationship`);
    return { id: requiredString(row.id, `${path}.id`, 128), relationship: row.relationship as ReviewedRecipeLineage['relationship'], sourceRecipeId: nullableString(row.sourceRecipeId, `${path}.sourceRecipeId`, 128), sourceRecipeVersionId: requiredString(row.sourceRecipeVersionId, `${path}.sourceRecipeVersionId`, 128), sourcePublicationId: nullableString(row.sourcePublicationId, `${path}.sourcePublicationId`, 128) };
  });

  return {
    title: requiredString(object.title, 'reviewedRecipe.title', 160),
    description: nullableString(object.description ?? null, 'reviewedRecipe.description', 4_000),
    yieldQuantity: nullableFiniteNumber(object.yieldQuantity ?? null, 'reviewedRecipe.yieldQuantity'),
    yieldUnit: nullableString(object.yieldUnit ?? null, 'reviewedRecipe.yieldUnit', 80),
    prepMinutes: nullableFiniteNumber(object.prepMinutes ?? null, 'reviewedRecipe.prepMinutes', { integer: true, max: 100_000 }),
    cookMinutes: nullableFiniteNumber(object.cookMinutes ?? null, 'reviewedRecipe.cookMinutes', { integer: true, max: 100_000 }),
    notes: nullableString(object.notes ?? null, 'reviewedRecipe.notes', 20_000),
    ingredients,
    instructions,
    provenance: {
      method: provenance.method as ReviewedRecipeData['provenance']['method'],
      sourceUrl: nullableString(provenance.sourceUrl, 'reviewedRecipe.provenance.sourceUrl', 2_048),
      sourceTitle: nullableString(provenance.sourceTitle, 'reviewedRecipe.provenance.sourceTitle', 512),
      sourceAuthor: nullableString(provenance.sourceAuthor, 'reviewedRecipe.provenance.sourceAuthor', 512),
      sourceContentHash: nullableString(provenance.sourceContentHash, 'reviewedRecipe.provenance.sourceContentHash', 256),
      rightsBasis: provenance.rightsBasis as RecipeRightsBasis,
    },
    credits,
    lineage,
  };
}
