import type { RecipeMediaAsset, RecipeVersion } from './recipeContracts';
import { formatKitchenQuantity, scaleRecipeQuantity } from './recipeScaling';
import type { CookCue } from './recipeCookContracts';

function sentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const capitalized = `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

export function splitCookInstruction(text: string): Pick<CookCue, 'actionText' | 'supportingCue'> {
  const patterns = [
    /^(.*?);\s*it is ready when\s+(.+)$/i,
    /^(.*?);\s*ready when\s+(.+)$/i,
    /^(.*?);\s*look for\s+(.+)$/i,
    /^(.*?);\s*you(?:'ll| will) know (?:it(?:'s| is) )?ready when\s+(.+)$/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text.trim());
    if (!match) continue;
    return {
      actionText: sentence(match[1]),
      supportingCue: { kind: 'ready_when', text: sentence(match[2]) },
    };
  }
  return { actionText: text.trim(), supportingCue: null };
}

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

export function buildRecipeCookCues(recipe: RecipeVersion, input: { servings: number; mediaAssets?: readonly RecipeMediaAsset[] }): CookCue[] {
  return recipe.instructions.map((step) => {
    const presentation = splitCookInstruction(step.text);
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
    const accessibilityLabel = presentation.supportingCue
      ? `Step ${step.position + 1} of ${recipe.instructions.length}. ${presentation.actionText} Ready when. ${presentation.supportingCue.text}`
      : `Step ${step.position + 1} of ${recipe.instructions.length}. ${presentation.actionText}`;
    const linkedMedia = (step.mediaAssetIds ?? [])
      .map((assetId) => input.mediaAssets?.find((asset) => asset.id === assetId))
      .find((asset) => {
        if (asset?.lifecycle !== 'active') return false;
        if (asset.mediaType.startsWith('image/')) return /^(bundle:|https?:|file:|data:)/.test(asset.storageRef);
        if (asset.mediaType.startsWith('video/')) return /^(https?:|file:)/.test(asset.storageRef);
        return false;
      });
    const media = linkedMedia ? {
      assetId: linkedMedia.id,
      storageRef: linkedMedia.storageRef,
      mediaType: linkedMedia.mediaType,
      altText: linkedMedia.altText,
    } : null;
    return { id: `cue:${step.id}`, instructionId: step.id, position: step.position, section: step.sectionLabel, displayText: step.text, ...presentation, accessibilityLabel, media, ingredientReferences, timerSuggestions: timers(step.text) };
  });
}
