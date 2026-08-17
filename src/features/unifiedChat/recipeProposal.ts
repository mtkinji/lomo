import type { RecipeProjection } from '../../capabilities/recipes/data/recipeCache';
import {
  parseReviewedRecipeData,
  type ReviewedRecipeData,
} from '../../capabilities/recipes/domain/recipeValidation';
import { deriveSpecializedRecipeEquipment } from '../../capabilities/recipes/domain/recipeEquipment';

const CREATE_KEYS = [
  'title', 'description', 'yieldQuantity', 'yieldUnit', 'prepMinutes', 'cookMinutes',
  'notes', 'ingredients', 'instructions',
] as const;

export type RecipeChatDraft = {
  title: string;
  description?: string | null;
  yieldQuantity?: number | null;
  yieldUnit?: string | null;
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  notes?: string | null;
  ingredients: string[];
  instructions: string[];
};

export type RecipeChatPatch = Partial<RecipeChatDraft>;

export type RecipeProposalOperation =
  | { type: 'create_recipe'; targetId: null; expectedVersion: 0; payload: { reviewedData: ReviewedRecipeData } }
  | { type: 'update_recipe'; targetId: string; expectedVersion: number; payload: { reviewedData: ReviewedRecipeData; changedFields: string[] } }
  | { type: 'delete_recipe'; targetId: string; expectedVersion: number; payload: Record<string, never> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const PATCH_LABELS: Record<(typeof CREATE_KEYS)[number], string> = {
  title: 'title', description: 'description', yieldQuantity: 'yield', yieldUnit: 'yield unit',
  prepMinutes: 'prep time', cookMinutes: 'cook time', notes: 'notes',
  ingredients: 'ingredients', instructions: 'instructions',
};

export function recipePatchFieldLabels(value: unknown): string[] {
  if (!isRecord(value)) return [];
  return CREATE_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(value, key)).map((key) => PATCH_LABELS[key]);
}

function hasOnlyKnownKeys(value: Record<string, unknown>): boolean {
  const allowed = new Set<string>(CREATE_KEYS);
  return Object.keys(value).every((key) => allowed.has(key));
}

function nullableText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string' || value.length > maxLength) return undefined;
  const trimmed = value.trim();
  return trimmed || null;
}

function nullableNumber(value: unknown, integer = false): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (integer && !Number.isInteger(value))) {
    return undefined;
  }
  return value;
}

function textLines(value: unknown, maxItems: number, maxLength: number): string[] | undefined {
  if (!Array.isArray(value) || value.length > maxItems) return undefined;
  const lines = value.map((line) => typeof line === 'string' ? line.trim() : '');
  return lines.every((line) => line.length > 0 && line.length <= maxLength) ? lines : undefined;
}

function parsedDraft(value: unknown, requireComplete: boolean): RecipeChatPatch | null {
  if (!isRecord(value) || !hasOnlyKnownKeys(value)) return null;
  const title = nullableText(value.title, 160);
  const description = nullableText(value.description, 4_000);
  const yieldQuantity = nullableNumber(value.yieldQuantity);
  const yieldUnit = nullableText(value.yieldUnit, 80);
  const prepMinutes = nullableNumber(value.prepMinutes, true);
  const cookMinutes = nullableNumber(value.cookMinutes, true);
  const notes = nullableText(value.notes, 20_000);
  const ingredients = value.ingredients === undefined ? undefined : textLines(value.ingredients, 200, 1_000);
  const instructions = value.instructions === undefined ? undefined : textLines(value.instructions, 200, 8_000);
  if (
    (value.title !== undefined && typeof title !== 'string') ||
    (value.description !== undefined && description === undefined) ||
    (value.yieldQuantity !== undefined && yieldQuantity === undefined) ||
    (value.yieldUnit !== undefined && yieldUnit === undefined) ||
    (value.prepMinutes !== undefined && prepMinutes === undefined) ||
    (value.cookMinutes !== undefined && cookMinutes === undefined) ||
    (value.notes !== undefined && notes === undefined) ||
    (value.ingredients !== undefined && ingredients === undefined) ||
    (value.instructions !== undefined && instructions === undefined)
  ) return null;
  if (requireComplete && (!title || !ingredients?.length || !instructions?.length)) return null;
  if (!requireComplete && Object.keys(value).length === 0) return null;
  return {
    ...(typeof title === 'string' ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(yieldQuantity !== undefined ? { yieldQuantity } : {}),
    ...(yieldUnit !== undefined ? { yieldUnit } : {}),
    ...(prepMinutes !== undefined ? { prepMinutes } : {}),
    ...(cookMinutes !== undefined ? { cookMinutes } : {}),
    ...(notes !== undefined ? { notes } : {}),
    ...(ingredients !== undefined ? { ingredients } : {}),
    ...(instructions !== undefined ? { instructions } : {}),
  };
}

function ingredientLines(lines: readonly string[], existing?: RecipeProjection['currentVersion']['ingredients']) {
  return lines.map((originalText, index) => ({
    id: existing?.[index]?.id ?? `chat-ingredient-${index + 1}`,
    groupLabel: existing?.[index]?.groupLabel ?? null,
    originalText,
    quantityMin: existing?.[index]?.quantityMin ?? null,
    quantityMax: existing?.[index]?.quantityMax ?? null,
    unit: existing?.[index]?.unit ?? null,
    ingredientConcept: existing?.[index]?.ingredientConcept ?? null,
    preparation: existing?.[index]?.preparation ?? null,
    optional: existing?.[index]?.optional ?? false,
    parseConfidence: existing?.[index]?.parseConfidence ?? null,
  }));
}

function instructionSteps(lines: readonly string[], existing?: RecipeProjection['currentVersion']['instructions']) {
  return lines.map((text, index) => ({
    id: existing?.[index]?.id ?? `chat-instruction-${index + 1}`,
    sectionLabel: existing?.[index]?.sectionLabel ?? null,
    text,
  }));
}

export function buildReviewedRecipeCreate(value: unknown): ReviewedRecipeData | null {
  const draft = parsedDraft(value, true);
  if (!draft?.title || !draft.ingredients || !draft.instructions) return null;
  try {
    return parseReviewedRecipeData({
      title: draft.title,
      description: draft.description ?? null,
      yieldQuantity: draft.yieldQuantity ?? null,
      yieldUnit: draft.yieldUnit ?? null,
      prepMinutes: draft.prepMinutes ?? null,
      cookMinutes: draft.cookMinutes ?? null,
      notes: draft.notes ?? null,
      ingredients: ingredientLines(draft.ingredients),
      instructions: instructionSteps(draft.instructions),
      equipmentRequirements: deriveSpecializedRecipeEquipment(draft.instructions),
      provenance: {
        method: 'manual', sourceUrl: null, sourceTitle: null, sourceAuthor: null,
        sourceContentHash: null, rightsBasis: 'user_authored',
      },
      credits: [],
      lineage: [],
    });
  } catch {
    return null;
  }
}

export function buildReviewedRecipeUpdate(
  projection: RecipeProjection,
  value: unknown,
): ReviewedRecipeData | null {
  const patch = parsedDraft(value, false);
  if (!patch) return null;
  const { recipe, currentVersion } = projection;
  const ingredients = patch.ingredients ?? currentVersion.ingredients.map((line) => line.originalText);
  const instructions = patch.instructions ?? currentVersion.instructions.map((step) => step.text);
  if (!ingredients.length || !instructions.length) return null;
  try {
    return parseReviewedRecipeData({
      title: patch.title ?? currentVersion.title,
      description: patch.description === undefined ? currentVersion.description : patch.description,
      yieldQuantity: patch.yieldQuantity === undefined ? currentVersion.yieldQuantity : patch.yieldQuantity,
      yieldUnit: patch.yieldUnit === undefined ? currentVersion.yieldUnit : patch.yieldUnit,
      prepMinutes: patch.prepMinutes === undefined ? currentVersion.prepMinutes : patch.prepMinutes,
      cookMinutes: patch.cookMinutes === undefined ? currentVersion.cookMinutes : patch.cookMinutes,
      notes: patch.notes === undefined ? currentVersion.notes : patch.notes,
      ingredients: ingredientLines(ingredients, patch.ingredients ? undefined : currentVersion.ingredients),
      instructions: instructionSteps(instructions, patch.instructions ? undefined : currentVersion.instructions),
      equipmentRequirements: patch.instructions
        ? deriveSpecializedRecipeEquipment(instructions)
        : currentVersion.equipmentRequirements,
      provenance: {
        method: recipe.provenance.method,
        sourceUrl: recipe.provenance.sourceUrl,
        sourceTitle: recipe.provenance.sourceTitle,
        sourceAuthor: recipe.provenance.sourceAuthor,
        sourceContentHash: recipe.provenance.sourceContentHash,
        rightsBasis: recipe.provenance.rightsBasis,
      },
      credits: recipe.credits.map(({ id, role, personId, publicProfileId, displayLabel, position, publicVisible }) => ({
        id, role, personId, publicProfileId, displayLabel, position, publicVisible,
      })),
      lineage: recipe.lineage.map(({ id, relationship, sourceRecipeId, sourceRecipeVersionId, sourcePublicationId }) => ({
        id, relationship, sourceRecipeId, sourceRecipeVersionId, sourcePublicationId,
      })),
    });
  } catch {
    return null;
  }
}
