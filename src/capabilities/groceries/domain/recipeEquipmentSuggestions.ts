import {
  deriveSpecializedRecipeEquipment,
  type SpecializedRecipeEquipment,
} from '../../recipes/domain/recipeEquipment';

export { deriveSpecializedRecipeEquipment } from '../../recipes/domain/recipeEquipment';

export type RecipeEquipmentSource = {
  recipeVersionId: string | null;
  recipeTitle: string;
  snapshotEquipment?: readonly unknown[];
};

export type RecipeEquipmentVersion = {
  versionId: string;
  instructions: readonly string[];
};

export type RecipeEquipmentSuggestion = SpecializedRecipeEquipment & {
  recipeTitles: string[];
};

export function formatEquipmentRecipeProvenance(recipeTitles: readonly string[]): string {
  const visible = recipeTitles.slice(0, 2);
  const remainder = recipeTitles.length - visible.length;
  return `Needed for ${visible.join(', ')}${remainder > 0 ? `, and ${remainder} more` : ''}`;
}

function normalizeConcept(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isEquipmentEvidence(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && Boolean(candidate.id.trim())
    && typeof candidate.label === 'string' && Boolean(candidate.label.trim());
}

export function parseSnapshotEquipment(value: unknown): SpecializedRecipeEquipment[] {
  return Array.isArray(value) ? value.filter(isEquipmentEvidence).flatMap((item) => {
    const label = String(item.label).trim();
    const structured = ['searchQuery', 'necessity', 'confidence', 'evidenceText', 'substitute']
      .some((key) => key in item);
    if (structured && (
      (item.necessity !== 'required' && item.necessity !== 'preferred')
      || typeof item.searchQuery !== 'string'
      || !item.searchQuery.trim()
      || typeof item.confidence !== 'number'
      || item.confidence < 0
      || item.confidence > 1
      || (item.evidenceText !== null && typeof item.evidenceText !== 'string')
      || (item.substitute !== null && typeof item.substitute !== 'string')
    )) return [];
    return [{
      id: String(item.id).trim(),
      label,
      searchQuery: typeof item.searchQuery === 'string' && item.searchQuery.trim()
        ? item.searchQuery.trim()
        : label.toLocaleLowerCase(),
      necessity: item.necessity === 'preferred' ? 'preferred' : 'required',
      confidence: typeof item.confidence === 'number' && item.confidence >= 0 && item.confidence <= 1
        ? item.confidence
        : 1,
      evidenceText: typeof item.evidenceText === 'string' && item.evidenceText.trim()
        ? item.evidenceText.trim()
        : null,
      substitute: typeof item.substitute === 'string' && item.substitute.trim()
        ? item.substitute.trim()
        : null,
    }];
  }) : [];
}

type PlanRecipeSource = {
  id?: string;
  title?: string;
  recipeSnapshot?: Record<string, unknown> | null;
};

export function collectRecipeEquipmentSources(input: {
  sourceKind: string;
  sourceRecipeVersionId: string | null;
  sourceTitle: string | null;
  contributingCandidateIds: readonly string[];
  plan: { entries: readonly PlanRecipeSource[]; candidates: readonly PlanRecipeSource[] } | null;
}): RecipeEquipmentSource[] {
  if (input.sourceKind === 'recipe_version') {
    return input.sourceRecipeVersionId && input.sourceTitle
      ? [{ recipeVersionId: input.sourceRecipeVersionId, recipeTitle: input.sourceTitle }]
      : [];
  }

  if (!input.plan) return [];
  const contributing = new Set(input.contributingCandidateIds);
  const records = input.sourceKind === 'household_plan'
    ? input.plan.candidates.filter((candidate) => Boolean(candidate.id && contributing.has(candidate.id)))
    : input.plan.entries;
  const seen = new Set<string>();

  return records.flatMap((record) => {
    const snapshot = record.recipeSnapshot;
    const versionId = typeof snapshot?.recipeVersionId === 'string'
      ? snapshot.recipeVersionId.trim()
      : '';
    const title = typeof record.title === 'string' ? record.title.trim() : '';
    if (!versionId || !title || seen.has(versionId)) return [];
    seen.add(versionId);
    const snapshotEquipment = Array.isArray(snapshot?.equipmentSuggestions)
      ? snapshot.equipmentSuggestions
      : [];
    return [{
      recipeVersionId: versionId,
      recipeTitle: title,
      ...(snapshotEquipment.length ? { snapshotEquipment } : {}),
    }];
  });
}

export function buildRecipeEquipmentSuggestions(input: {
  sources: readonly RecipeEquipmentSource[];
  recipes: readonly RecipeEquipmentVersion[];
  existingItemConcepts: readonly string[];
  limit?: number;
}): RecipeEquipmentSuggestion[] {
  const recipeByVersionId = new Map(input.recipes.map((recipe) => [recipe.versionId, recipe]));
  const existing = new Set(input.existingItemConcepts.map(normalizeConcept));
  const suggestions = new Map<string, RecipeEquipmentSuggestion & { firstSeen: number }>();
  let firstSeen = 0;

  for (const source of input.sources) {
    const snapshotEquipment = parseSnapshotEquipment(source.snapshotEquipment);
    const currentRecipe = source.recipeVersionId
      ? recipeByVersionId.get(source.recipeVersionId)
      : undefined;
    const equipment = snapshotEquipment.length
      ? snapshotEquipment
      : currentRecipe
        ? deriveSpecializedRecipeEquipment(currentRecipe.instructions)
        : [];

    for (const item of equipment) {
      if (item.necessity !== 'required' || item.substitute || item.confidence < 0.8) continue;
      const canonicalConcept = normalizeConcept(item.id.replace(/-/g, ' '));
      if (existing.has(normalizeConcept(item.label)) || existing.has(canonicalConcept)) continue;
      const suggestionKey = `${item.id}:${normalizeConcept(item.searchQuery)}`;
      const current = suggestions.get(suggestionKey);
      if (current) {
        if (!current.recipeTitles.includes(source.recipeTitle)) {
          current.recipeTitles.push(source.recipeTitle);
        }
      } else {
        suggestions.set(suggestionKey, {
          id: item.id,
          label: item.label,
          searchQuery: item.searchQuery,
          necessity: item.necessity,
          confidence: item.confidence,
          evidenceText: item.evidenceText,
          substitute: item.substitute,
          recipeTitles: [source.recipeTitle],
          firstSeen,
        });
        firstSeen += 1;
      }
    }
  }

  return [...suggestions.values()]
    .sort((left, right) =>
      right.recipeTitles.length - left.recipeTitles.length
      || Number(normalizeConcept(right.searchQuery) !== normalizeConcept(right.id.replace(/-/g, ' ')))
        - Number(normalizeConcept(left.searchQuery) !== normalizeConcept(left.id.replace(/-/g, ' ')))
      || right.confidence - left.confidence
      || left.firstSeen - right.firstSeen,
    )
    .slice(0, Math.max(0, input.limit ?? 3))
    .map(({ firstSeen: _firstSeen, ...suggestion }) => suggestion);
}
