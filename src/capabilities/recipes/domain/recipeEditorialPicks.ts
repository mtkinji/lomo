import type { SpecializedRecipeEquipment } from './recipeEquipment';
import { deriveSpecializedRecipeEquipment } from './recipeEquipment';

export type RecipeEditorialPickThumbnail = 'food-processor';

export type RecipeEditorialPick = {
  id: string;
  equipmentId: string;
  asin: string;
  title: string;
  rationale: string;
  thumbnailAsset: RecipeEditorialPickThumbnail;
  thumbnailUrl?: string | null;
};

type EditorialPickCatalogEntry = RecipeEditorialPick & {
  capacityCups: number | null;
};

const EDITORIAL_PICK_CATALOG: readonly EditorialPickCatalogEntry[] = [{
  id: 'kitchenaid-7-cup-food-processor',
  equipmentId: 'food-processor',
  asin: 'B07BW1ZPB5',
  title: 'KitchenAid 7-Cup Food Processor',
  rationale: 'A practical size for everyday chopping, slicing, and puréeing.',
  thumbnailAsset: 'food-processor',
  thumbnailUrl: null,
  capacityCups: 7,
}];

function requiredCupCapacity(requirement: SpecializedRecipeEquipment): number | null {
  const match = /\b(\d+(?:\.\d+)?)\s*[- ]?cups?\b/i.exec(
    `${requirement.label} ${requirement.searchQuery}`,
  );
  if (!match) return null;
  const capacity = Number(match[1]);
  return Number.isFinite(capacity) && capacity > 0 ? capacity : null;
}

export function resolveRecipeEditorialPicks(input: {
  equipmentRequirements: readonly SpecializedRecipeEquipment[];
  instructions: readonly string[];
}): RecipeEditorialPick[] {
  const requirements = input.equipmentRequirements.length
    ? input.equipmentRequirements
    : deriveSpecializedRecipeEquipment(input.instructions);
  const seen = new Set<string>();

  return requirements.flatMap((requirement) => {
    if (
      requirement.necessity !== 'required'
      || requirement.substitute
      || requirement.confidence < 0.8
    ) return [];

    const catalogEntry = EDITORIAL_PICK_CATALOG.find((entry) =>
      entry.equipmentId === requirement.id,
    );
    if (!catalogEntry || seen.has(catalogEntry.id)) return [];

    const recipeCapacity = requiredCupCapacity(requirement);
    if (
      recipeCapacity !== null
      && catalogEntry.capacityCups !== null
      && catalogEntry.capacityCups < recipeCapacity
    ) return [];

    seen.add(catalogEntry.id);
    const { capacityCups: _capacityCups, ...pick } = catalogEntry;
    return [pick];
  });
}
