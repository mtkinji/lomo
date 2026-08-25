import { parseIngredientLine } from '@kwilt/food-core';

import type { RecipeMediaAsset, RecipeVersion } from './recipeContracts';
import { assessRecipeScaleability } from './recipeScaleAssessment';
import { buildRecipeInstructionPhases } from './recipeInstructionPhases';
import { scaledIngredientAmount, type RecipeScaleMultiplier } from './recipeScaling';
import type { CookCue } from './recipeCookContracts';

const leadingQuantity = /^(?:(?:one|two|three|four|five|six|seven|eight|nine|ten)|\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|[⅛¼⅓⅜½⅝⅔¾⅞])\s*/i;
const leadingUnit = /^(?:cups?|tablespoons?|tbsp|teaspoons?|tsp|ounces?|oz|pounds?|lbs?|lb|grams?|kilograms?|kg|bunches?|cloves?)\b\s*/i;

function originalIngredientConcept(originalText: string, parsedUnit: string | null): string {
  let concept = originalText.trim().replace(leadingQuantity, '');
  if (parsedUnit && parsedUnit !== 'count') concept = concept.replace(leadingUnit, '');
  return concept
    .replace(/^\([^)]*\)\s*/, '')
    .split(',')[0]
    .trim();
}

function normalizedTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
      if (token.endsWith('es') && token.length > 4) return token.slice(0, -2);
      if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) return token.slice(0, -1);
      return token;
    });
}

function includesTokens(haystack: readonly string[], needle: readonly string[]): boolean {
  if (!needle.length || needle.length > haystack.length) return false;
  return haystack.some((_, index) => needle.every((token, offset) => haystack[index + offset] === token));
}

const weakIngredientWords = new Set([
  'all', 'and', 'cold', 'finely', 'for', 'fresh', 'from', 'ground', 'hot', 'in',
  'into', 'large', 'medium', 'of', 'or', 'packed', 'plain', 'plus', 'small', 'the',
  'thick', 'to', 'warm', 'well',
]);
const ingredientFormWords = new Set([
  'berry', 'breast', 'clove', 'drumstick', 'leaf', 'piece', 'slice', 'sprig',
  'stem', 'thigh',
]);

function ingredientMention(concept: string, instruction: string): { specificity: number; tokens: string[] } | null {
  const matchConcept = concept.split(/\s+for\s+/i)[0];
  const conceptTokens = normalizedTokens(matchConcept);
  const instructionTokens = normalizedTokens(instruction);
  for (let length = conceptTokens.length; length > 0; length -= 1) {
    for (let start = 0; start <= conceptTokens.length - length; start += 1) {
      const candidate = conceptTokens.slice(start, start + length);
      if (length === 1) {
        const token = candidate[0];
        const isHead = start === conceptTokens.length - 1;
        const namesIngredientForm = ingredientFormWords.has(conceptTokens[start + 1]);
        if (weakIngredientWords.has(token) || (!isHead && !namesIngredientForm)) continue;
      }
      if (includesTokens(instructionTokens, candidate)) return { specificity: length, tokens: candidate };
    }
  }
  return null;
}

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

export function buildRecipeCookCues(recipe: RecipeVersion, input: { multiplier: RecipeScaleMultiplier; mediaAssets?: readonly RecipeMediaAsset[] }): CookCue[] {
  const phases = buildRecipeInstructionPhases(recipe.instructions);
  const scaling = assessRecipeScaleability(recipe.ingredients, recipe.scalingState);
  const multiplier: RecipeScaleMultiplier = scaling.available ? input.multiplier : 1;
  const result: CookCue[] = [];
  for (const phase of phases) {
    const step = recipe.instructions.find((candidate) => candidate.id === phase.id)!;
    for (const instructionCue of phase.cues) {
    const cueText = instructionCue.text;
    const presentation = splitCookInstruction(cueText);
    const ingredientCandidates = recipe.ingredients.flatMap((line) => {
      const parsed = line.ingredientConcept ? null : parseIngredientLine(line.originalText);
      const concept = line.ingredientConcept?.trim()
        || originalIngredientConcept(line.originalText, parsed?.unit ?? null)
        || parsed?.concept.trim();
      const mention = concept ? ingredientMention(concept, cueText) : null;
      if (!concept || !mention) return [];
      let displayAmount: string | null = null;
      const quantityIsReliable = line.ingredientConcept
        ? (line.parseConfidence ?? 0) >= 0.8
        : parsed?.quantityMin !== null;
      if (quantityIsReliable) displayAmount = scaledIngredientAmount(line, multiplier);
      return [{
        reference: { ingredientLineId: line.id, concept, displayAmount },
        head: normalizedTokens(concept.split(/\s+for\s+/i)[0]).at(-1) ?? '',
        ...mention,
      }];
    });
    const ingredientReferences = ingredientCandidates
      .filter((candidate) => {
        const sameHead = ingredientCandidates.filter((other) => other.head === candidate.head);
        const strongestSameHead = Math.max(...sameHead.map((other) => other.specificity));
        if (candidate.specificity < strongestSameHead) return false;
        if (candidate.specificity > 1) return true;
        if (sameHead.length > 1) return false;
        return !ingredientCandidates.some((other) =>
          other !== candidate
          && other.specificity > 1
          && other.tokens.includes(candidate.tokens[0]));
      })
      .map((candidate) => candidate.reference);
    const phaseContext = phase.cues.length > 1
      ? `Phase ${phase.position + 1} of ${phases.length}. Action ${instructionCue.position + 1} of ${phase.cues.length}.`
      : `Phase ${phase.position + 1} of ${phases.length}.`;
    const stepAccessibilityLabel = presentation.supportingCue
      ? `${phaseContext} ${presentation.actionText} Ready when. ${presentation.supportingCue.text}`
      : `${phaseContext} ${presentation.actionText}`;
    const ingredientAccessibilityLabel = ingredientReferences.length
      ? ` For this action. ${ingredientReferences
        .map((item) => sentence(`${item.displayAmount ? `${item.displayAmount} ` : ''}${item.concept}`))
        .join(' ')}`
      : '';
    const accessibilityLabel = `${stepAccessibilityLabel}${ingredientAccessibilityLabel}`;
    const mediaAssetIds = instructionCue.mediaAssetIds
      ?? (instructionCue.position === 0 ? step.mediaAssetIds : undefined)
      ?? [];
    const linkedMedia = mediaAssetIds
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
    result.push({
      id: instructionCue.position === 0
        ? `cue:${phase.id}`
        : `cue:${phase.id}:${instructionCue.position + 1}`,
      instructionId: phase.id,
      position: result.length,
      section: phase.title,
      phasePosition: phase.position,
      phaseCount: phases.length,
      cuePositionInPhase: instructionCue.position,
      cueCountInPhase: phase.cues.length,
      displayText: cueText,
      ...presentation,
      accessibilityLabel,
      media,
      ingredientReferences,
      timerSuggestions: timers(cueText),
    });
    }
  }
  return result;
}
