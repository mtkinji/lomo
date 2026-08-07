import type { RecipeVersion } from './recipeContracts';
import { formatKitchenQuantity, scaleRecipeQuantity } from './recipeScaling';
import type { CookCue } from './recipeCookContracts';

function timers(text: string): CookCue['timerSuggestions'] {
  const result: CookCue['timerSuggestions'] = [];
  const pattern = /\b([a-z]+)\s+for\s+(\d+(?:\.\d+)?)\s*(seconds?|minutes?|hours?)\b/gi;
  for (const match of text.matchAll(pattern)) {
    const amount = Number(match[2]); const unit = match[3].toLowerCase();
    const durationSeconds = Math.round(amount * (unit.startsWith('hour') ? 3600 : unit.startsWith('minute') ? 60 : 1));
    result.push({ durationSeconds, label: match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase() });
  }
  return result;
}

export function buildRecipeCookCues(recipe: RecipeVersion, input: { servings: number }): CookCue[] {
  return recipe.instructions.map((step) => {
    const lower = step.text.toLowerCase();
    const ingredientReferences = recipe.ingredients.flatMap((line) => {
      const concept = line.ingredientConcept?.trim(); if (!concept || !lower.includes(concept.toLowerCase())) return [];
      let displayAmount: string | null = null;
      if (recipe.yieldQuantity && line.quantityMin !== null && (line.parseConfidence ?? 0) >= 0.8) {
        const scaled = scaleRecipeQuantity({ quantity: line.quantityMin, quantityMax: line.quantityMax, fromYield: recipe.yieldQuantity, toYield: input.servings });
        if (scaled.quantity !== null) displayAmount = `${formatKitchenQuantity(scaled.quantity)}${scaled.quantityMax === null ? '' : `–${formatKitchenQuantity(scaled.quantityMax)}`}${line.unit ? ` ${line.unit}` : ''}`;
      }
      return [{ ingredientLineId: line.id, concept, displayAmount }];
    });
    return { id: `cue:${step.id}`, instructionId: step.id, position: step.position, section: step.sectionLabel, displayText: step.text, accessibilityLabel: `Step ${step.position + 1} of ${recipe.instructions.length}. ${step.text}`, ingredientReferences, timerSuggestions: timers(step.text) };
  });
}
