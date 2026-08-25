import type { RecipeVersion } from './recipeContracts';
import type { RecipeUpdateDraft } from './recipeUpdateDraft';

export type RecipeUpdateOperation =
  | { kind: 'set_title'; value: string }
  | { kind: 'set_description'; value: string }
  | { kind: 'set_yield'; quantity: number; unit: string }
  | { kind: 'replace_ingredient'; lineId: string; value: string }
  | { kind: 'add_ingredient'; afterLineId: string | null; value: string }
  | { kind: 'remove_ingredient'; lineId: string }
  | { kind: 'replace_instruction'; stepId: string; value: string }
  | { kind: 'add_instruction'; afterStepId: string | null; value: string }
  | { kind: 'remove_instruction'; stepId: string }
  | { kind: 'set_notes'; value: string };

export type RecipeUpdateSuggestion = {
  summary: string;
  operations: RecipeUpdateOperation[];
};

export class RecipeUpdateSuggestionError extends Error {
  constructor(public readonly code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = 'RecipeUpdateSuggestionError';
  }
}

const bounded = (value: unknown, max: number, code: string): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new RecipeUpdateSuggestionError(code, `Expected non-empty text up to ${max} characters.`);
  }
  return value.trim();
};

const exactKeys = (value: Record<string, unknown>, expected: readonly string[]) => {
  const allowed = new Set(expected);
  if (Object.keys(value).some((key) => !allowed.has(key)) || expected.some((key) => !(key in value))) {
    throw new RecipeUpdateSuggestionError('recipe_update.operation_invalid', 'Suggestion operation shape is invalid.');
  }
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RecipeUpdateSuggestionError('recipe_update.operation_invalid', 'Suggestion operation must be an object.');
  }
  return value as Record<string, unknown>;
}

function parseOperation(value: unknown): RecipeUpdateOperation {
  const operation = record(value);
  const kind = operation.kind;
  if (kind === 'set_title' || kind === 'set_description' || kind === 'set_notes') {
    exactKeys(operation, ['kind', 'value']);
    return { kind, value: bounded(operation.value, kind === 'set_title' ? 160 : 4_000, 'recipe_update.value_invalid') };
  }
  if (kind === 'set_yield') {
    exactKeys(operation, ['kind', 'quantity', 'unit']);
    if (typeof operation.quantity !== 'number' || !Number.isFinite(operation.quantity) || operation.quantity <= 0 || operation.quantity > 10_000) {
      throw new RecipeUpdateSuggestionError('recipe_update.value_invalid', 'Yield quantity must be a positive bounded number.');
    }
    return {
      kind,
      quantity: operation.quantity,
      unit: bounded(operation.unit, 80, 'recipe_update.value_invalid'),
    };
  }
  if (kind === 'set_servings') {
    exactKeys(operation, ['kind', 'value']);
    if (typeof operation.value !== 'number' || !Number.isFinite(operation.value) || operation.value <= 0 || operation.value > 10_000) {
      throw new RecipeUpdateSuggestionError('recipe_update.value_invalid', 'Servings must be a positive bounded number.');
    }
    return { kind: 'set_yield', quantity: operation.value, unit: 'servings' };
  }
  if (kind === 'replace_ingredient') {
    exactKeys(operation, ['kind', 'lineId', 'value']);
    return { kind, lineId: bounded(operation.lineId, 128, 'recipe_update.target_invalid'), value: bounded(operation.value, 1_000, 'recipe_update.value_invalid') };
  }
  if (kind === 'remove_ingredient') {
    exactKeys(operation, ['kind', 'lineId']);
    return { kind, lineId: bounded(operation.lineId, 128, 'recipe_update.target_invalid') };
  }
  if (kind === 'add_ingredient') {
    exactKeys(operation, ['kind', 'afterLineId', 'value']);
    return {
      kind,
      afterLineId: operation.afterLineId === null ? null : bounded(operation.afterLineId, 128, 'recipe_update.target_invalid'),
      value: bounded(operation.value, 1_000, 'recipe_update.value_invalid'),
    };
  }
  if (kind === 'replace_instruction') {
    exactKeys(operation, ['kind', 'stepId', 'value']);
    return { kind, stepId: bounded(operation.stepId, 128, 'recipe_update.target_invalid'), value: bounded(operation.value, 8_000, 'recipe_update.value_invalid') };
  }
  if (kind === 'remove_instruction') {
    exactKeys(operation, ['kind', 'stepId']);
    return { kind, stepId: bounded(operation.stepId, 128, 'recipe_update.target_invalid') };
  }
  if (kind === 'add_instruction') {
    exactKeys(operation, ['kind', 'afterStepId', 'value']);
    return {
      kind,
      afterStepId: operation.afterStepId === null ? null : bounded(operation.afterStepId, 128, 'recipe_update.target_invalid'),
      value: bounded(operation.value, 8_000, 'recipe_update.value_invalid'),
    };
  }
  throw new RecipeUpdateSuggestionError('recipe_update.operation_invalid', 'Suggestion operation kind is unsupported.');
}

function targetKey(operation: RecipeUpdateOperation): string | null {
  if ('lineId' in operation) return `ingredient:${operation.lineId}`;
  if ('stepId' in operation) return `instruction:${operation.stepId}`;
  if (operation.kind.startsWith('set_')) return operation.kind;
  return null;
}

export function parseRecipeUpdateSuggestion(value: unknown, draft: RecipeUpdateDraft): RecipeUpdateSuggestion {
  const suggestion = record(value);
  exactKeys(suggestion, ['summary', 'operations']);
  if (Array.isArray(suggestion.operations) && suggestion.operations.length === 0) {
    throw new RecipeUpdateSuggestionError('recipe_update.empty', 'Suggestion did not contain any changes.');
  }
  if (!Array.isArray(suggestion.operations) || suggestion.operations.length > 30) {
    throw new RecipeUpdateSuggestionError('recipe_update.operations_invalid', 'Suggestion must contain between 1 and 30 operations.');
  }
  const operations = suggestion.operations.map(parseOperation);
  const ingredientIds = new Set(draft.ingredients.map((line) => line.id));
  const instructionIds = new Set(draft.instructions.map((step) => step.id));
  const targets = new Set<string>();
  for (const operation of operations) {
    const referencedIngredient = 'lineId' in operation ? operation.lineId : operation.kind === 'add_ingredient' ? operation.afterLineId : null;
    const referencedStep = 'stepId' in operation ? operation.stepId : operation.kind === 'add_instruction' ? operation.afterStepId : null;
    if ((referencedIngredient && !ingredientIds.has(referencedIngredient)) || (referencedStep && !instructionIds.has(referencedStep))) {
      throw new RecipeUpdateSuggestionError('recipe_update.target_missing', 'Suggestion refers to a field that is not in this draft.');
    }
    const key = targetKey(operation);
    if (key && targets.has(key)) {
      throw new RecipeUpdateSuggestionError('recipe_update.target_duplicate', 'Suggestion changes the same field more than once.');
    }
    if (key) targets.add(key);
  }
  return { summary: bounded(suggestion.summary, 500, 'recipe_update.summary_invalid'), operations };
}

function insertAfter<T extends { id: string }>(items: T[], afterId: string | null, item: T): T[] {
  if (afterId === null) return [item, ...items];
  const index = items.findIndex((candidate) => candidate.id === afterId);
  return [...items.slice(0, index + 1), item, ...items.slice(index + 1)];
}

export function applyRecipeUpdateSuggestion(
  input: RecipeUpdateDraft,
  suggestion: RecipeUpdateSuggestion,
  nextId: (kind: 'ingredient' | 'step') => string,
): RecipeUpdateDraft {
  let draft: RecipeUpdateDraft = {
    ...input,
    ingredients: input.ingredients.map((line) => ({ ...line })),
    instructions: input.instructions.map((step) => ({ ...step })),
  };
  for (const operation of suggestion.operations) {
    switch (operation.kind) {
      case 'set_title': draft = { ...draft, title: operation.value }; break;
      case 'set_description': draft = { ...draft, description: operation.value }; break;
      case 'set_yield': draft = { ...draft, yieldQuantity: String(operation.quantity), yieldUnit: operation.unit }; break;
      case 'set_notes': draft = { ...draft, notes: operation.value }; break;
      case 'replace_ingredient': draft = { ...draft, ingredients: draft.ingredients.map((line) => line.id === operation.lineId ? { ...line, originalText: operation.value } : line) }; break;
      case 'remove_ingredient': draft = { ...draft, ingredients: draft.ingredients.filter((line) => line.id !== operation.lineId) }; break;
      case 'add_ingredient': draft = { ...draft, ingredients: insertAfter(draft.ingredients, operation.afterLineId, { id: nextId('ingredient'), originalText: operation.value }) }; break;
      case 'replace_instruction': draft = { ...draft, instructions: draft.instructions.map((step) => step.id === operation.stepId ? { ...step, text: operation.value } : step) }; break;
      case 'remove_instruction': draft = { ...draft, instructions: draft.instructions.filter((step) => step.id !== operation.stepId) }; break;
      case 'add_instruction': draft = { ...draft, instructions: insertAfter(draft.instructions, operation.afterStepId, { id: nextId('step'), text: operation.value }) }; break;
    }
  }
  return draft;
}

const operationSchemas = [
  ['set_title', { value: { type: 'string', minLength: 1, maxLength: 160 } }, ['value']],
  ['set_description', { value: { type: 'string', minLength: 1, maxLength: 4_000 } }, ['value']],
  ['set_yield', { quantity: { type: 'number', exclusiveMinimum: 0, maximum: 10_000 }, unit: { type: 'string', minLength: 1, maxLength: 80 } }, ['quantity', 'unit']],
  ['replace_ingredient', { lineId: { type: 'string' }, value: { type: 'string', minLength: 1, maxLength: 1_000 } }, ['lineId', 'value']],
  ['add_ingredient', { afterLineId: { type: ['string', 'null'] }, value: { type: 'string', minLength: 1, maxLength: 1_000 } }, ['afterLineId', 'value']],
  ['remove_ingredient', { lineId: { type: 'string' } }, ['lineId']],
  ['replace_instruction', { stepId: { type: 'string' }, value: { type: 'string', minLength: 1, maxLength: 8_000 } }, ['stepId', 'value']],
  ['add_instruction', { afterStepId: { type: ['string', 'null'] }, value: { type: 'string', minLength: 1, maxLength: 8_000 } }, ['afterStepId', 'value']],
  ['remove_instruction', { stepId: { type: 'string' } }, ['stepId']],
  ['set_notes', { value: { type: 'string', minLength: 1, maxLength: 4_000 } }, ['value']],
] as const;

export const RECIPE_UPDATE_SUGGESTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string', minLength: 1, maxLength: 500 },
    operations: {
      type: 'array', minItems: 1, maxItems: 30,
      items: {
        oneOf: operationSchemas.map(([kind, properties, required]) => ({
          type: 'object', additionalProperties: false,
          properties: { kind: { type: 'string', enum: [kind] }, ...properties },
          required: ['kind', ...required],
        })),
      },
    },
  },
  required: ['summary', 'operations'],
} as const;

export function buildRecipeUpdatePrompt(input: { version: RecipeVersion; instruction: string }) {
  const instruction = bounded(input.instruction, 2_000, 'recipe_update.instruction_invalid');
  return {
    schema: RECIPE_UPDATE_SUGGESTION_SCHEMA,
    systemPrompt: [
      'Prepare a structured proposal for updating one recipe draft.',
      'Never save or mutate the recipe. The person will review every proposed field.',
      'Only propose changes supported by the instruction. Do not invent ingredients, quantities, safety claims, or cultural substitutions.',
      'Refer to existing ingredient and instruction IDs exactly. Keep the proposal small and internally consistent.',
    ].join(' '),
    userPrompt: JSON.stringify({
      instruction,
      exactRecipeVersion: {
        id: input.version.id,
        version: input.version.version,
        title: input.version.title,
        description: input.version.description,
        yieldQuantity: input.version.yieldQuantity,
        yieldUnit: input.version.yieldUnit,
        ingredients: input.version.ingredients.map(({ id, originalText }) => ({ id, originalText })),
        instructions: input.version.instructions.map(({ id, text }) => ({ id, text })),
        notes: input.version.notes,
      },
    }),
  };
}
