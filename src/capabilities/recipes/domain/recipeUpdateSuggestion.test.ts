import { recipeVersionContractFixture } from './recipeContractFixtures';
import {
  applyRecipeUpdateSuggestion,
  buildRecipeUpdatePrompt,
  parseRecipeUpdateSuggestion,
} from './recipeUpdateSuggestion';
import type { RecipeUpdateDraft } from './recipeUpdateDraft';

const draft = (): RecipeUpdateDraft => ({
  title: "Grandma Ruth's Cake",
  description: '',
  yieldQuantity: '8',
  yieldUnit: 'servings',
  ingredients: [
    { id: 'ingredient-1', originalText: '1 1/2 cups flour, sifted' },
    { id: 'ingredient-2', originalText: '2 eggs' },
  ],
  instructions: [
    { id: 'step-1', text: 'Bake until the center springs back.' },
    { id: 'step-2', text: 'Cool completely before glazing.' },
  ],
  sourceTitle: "Grandma Ruth's card",
  sourceAuthor: 'Ruth',
  notes: 'Best served the next day.',
});
describe('recipe update suggestions', () => {
  it('grounds the prompt in one exact immutable version and asks for a reviewable draft diff', () => {
    const prompt = buildRecipeUpdatePrompt({
      version: recipeVersionContractFixture(),
      instruction: 'Double the eggs and make it serve twelve.',
    });
    expect(prompt.systemPrompt).toContain('Never save or mutate the recipe');
    expect(prompt.systemPrompt).toContain('Only propose changes supported by the instruction');
    expect(prompt.userPrompt).toContain('rv-family-cake-1');
    expect(prompt.userPrompt).toContain('Double the eggs and make it serve twelve.');
    expect(prompt.userPrompt).toContain('2 eggs');
    expect(prompt.schema.required).toEqual(['summary', 'operations']);
  });

  it('parses bounded operations and applies them to the same editable draft', () => {
    const suggestion = parseRecipeUpdateSuggestion({
      summary: 'Serve twelve with twice the eggs.',
      operations: [
        { kind: 'set_yield', quantity: 12, unit: 'servings' },
        { kind: 'replace_ingredient', lineId: 'ingredient-2', value: '4 eggs' },
        { kind: 'add_instruction', afterStepId: 'step-1', value: 'Rotate the pan halfway through.' },
      ],
    }, draft());
    const applied = applyRecipeUpdateSuggestion(draft(), suggestion, () => 'new-step');
    expect(applied.yieldQuantity).toBe('12');
    expect(applied.yieldUnit).toBe('servings');
    expect(applied.ingredients[1].originalText).toBe('4 eggs');
    expect(applied.instructions.map((step) => step.text)).toEqual([
      'Bake until the center springs back.',
      'Rotate the pan halfway through.',
      'Cool completely before glazing.',
    ]);
  });

  it('normalizes cached legacy serving suggestions at the parser boundary', () => {
    const suggestion = parseRecipeUpdateSuggestion({
      summary: 'Make twelve servings.',
      operations: [{ kind: 'set_servings', value: 12 }],
    }, draft());

    expect(suggestion.operations).toEqual([{ kind: 'set_yield', quantity: 12, unit: 'servings' }]);
  });

  it('rejects unknown targets, duplicate targets, empty output, and oversized suggestions', () => {
    expect(() => parseRecipeUpdateSuggestion({
      summary: 'Change it.',
      operations: [{ kind: 'replace_ingredient', lineId: 'missing', value: '3 eggs' }],
    }, draft())).toThrow('recipe_update.target_missing');
    expect(() => parseRecipeUpdateSuggestion({
      summary: 'Change it.',
      operations: [
        { kind: 'replace_ingredient', lineId: 'ingredient-2', value: '3 eggs' },
        { kind: 'remove_ingredient', lineId: 'ingredient-2' },
      ],
    }, draft())).toThrow('recipe_update.target_duplicate');
    expect(() => parseRecipeUpdateSuggestion({ summary: 'Nothing', operations: [] }, draft())).toThrow('recipe_update.empty');
    expect(() => parseRecipeUpdateSuggestion({
      summary: 'Too much',
      operations: Array.from({ length: 31 }, (_, index) => ({ kind: 'set_notes', value: `note ${index}` })),
    }, draft())).toThrow('recipe_update.operations_invalid');
  });
});
