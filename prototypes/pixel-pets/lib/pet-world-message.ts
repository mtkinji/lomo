import type { PetWorldAction } from "./pet-world.ts";

export type PetWorldInteractionMessage = {
  title: string;
  detail: string;
};

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
