import type {
  RecipeInstructionCue,
  RecipeInstructionStep,
} from './recipeContracts';

export type RecipeInstructionPhase = {
  id: string;
  position: number;
  title: string | null;
  fullText: string;
  cues: RecipeInstructionCue[];
};

export function segmentEditorialInstructionCues(text: string): string[] {
  const cues = text
    .trim()
    .split(/(?<=[.!?])\s+(?=["“‘']?[A-Z0-9])/)
    .map((cue) => cue.trim())
    .filter(Boolean);
  return cues.length ? cues : [text.trim()];
}

export function buildRecipeInstructionPhases(
  steps: readonly RecipeInstructionStep[],
): RecipeInstructionPhase[] {
  return steps.map((step) => ({
    id: step.id,
    position: step.position,
    title: step.sectionLabel,
    fullText: step.text,
    cues: step.cues?.length
      ? step.cues.map((cue) => ({ ...cue }))
      : [{
        id: `${step.id}-cue-1`,
        position: 0,
        text: step.text,
        mediaAssetIds: step.mediaAssetIds ?? [],
      }],
  }));
}
