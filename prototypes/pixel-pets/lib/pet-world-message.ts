import type { PetWorldAction } from "./pet-world.ts";

export type PetWorldInteractionMessage = {
  title: string;
  detail: string;
};

const CAUSAL_SCENE_NARRATION_ACTIONS = new Set<PetWorldAction>([
  "weather-notice",
  "wind-brace",
  "rain-flinch",
  "shelter",
  "bask",
  "shade",
  "leaf-invite",
  "leaf-catch",
  "puddle-notice",
  "puddle-invite",
  "puddle-splash",
  "guardian-land",
]);

export function shouldShowSceneNarration(
  action: PetWorldAction,
  context: { focusActive: boolean },
): boolean {
  if (action === "seek-shelter") return !context.focusActive;
  return CAUSAL_SCENE_NARRATION_ACTIONS.has(action);
}

export function resolveWorldInteractionMessage(
  action: PetWorldAction,
  context: { focusActive: boolean; name: string },
): PetWorldInteractionMessage | null {
  if (action !== "seek-shelter") return null;

  return context.focusActive
    ? {
        title: "Finding quiet together",
        detail: `${context.name} is padding to a familiar place beneath the leaves.`,
      }
    : {
        title: "Weather coming",
        detail: `${context.name} knows where the old tree keeps the ground dry.`,
      };
}
