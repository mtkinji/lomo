function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function fieldsRecord(value: unknown): Record<string, unknown> | null {
  const direct = record(value);
  if (direct) return direct;
  if (!Array.isArray(value)) return null;
  const entries = value.flatMap((item) => {
    const field = record(item); const key = text(field?.key);
    return key && field && Object.prototype.hasOwnProperty.call(field, 'value')
      ? [[key, field.value] as [string, unknown]] : [];
  });
  return entries.length === value.length ? Object.fromEntries(entries) : null;
}

export function validMealFields(value: unknown): value is Record<string, unknown> {
  const fields = fieldsRecord(value);
  if (!fields || Object.keys(fields).length === 0) return false;
  const allowed = new Set(['usualDinerCount', 'usualDinerPersonIds', 'setupState', 'foodNeedChanges']);
  if (Object.keys(fields).some((key) => !allowed.has(key))) return false;
  if (fields.usualDinerCount !== undefined && (!Number.isInteger(fields.usualDinerCount) || Number(fields.usualDinerCount) < 1 || Number(fields.usualDinerCount) > 24)) return false;
  if (fields.usualDinerPersonIds !== undefined && (!Array.isArray(fields.usualDinerPersonIds) || fields.usualDinerPersonIds.some((id) => !text(id)))) return false;
  if (fields.setupState !== undefined && !['unseen', 'skipped', 'completed'].includes(String(fields.setupState))) return false;
  if (fields.foodNeedChanges !== undefined && (!Array.isArray(fields.foodNeedChanges) || fields.foodNeedChanges.length > 100)) return false;
  return true;
}

export function mealPlanHorizon(value: unknown): Record<string, unknown> | null {
  const input = record(value); const kind = text(input?.kind);
  if (!input || !kind) return null;
  if (kind === 'open' && Object.keys(input).length === 1) return { kind };
  if (kind === 'next_shop' && Object.keys(input).every((key) => key === 'kind' || key === 'shopBy')
    && (input.shopBy === null || !!text(input.shopBy))) return { kind, shopBy: input.shopBy };
  const count = Number(input.count);
  if (kind === 'meal_count' && Object.keys(input).length === 2
    && Number.isInteger(count) && count >= 1 && count <= 60) return { kind, count };
  const startsOn = text(input.startsOn); const endsOn = text(input.endsOn);
  if (kind === 'date_range' && Object.keys(input).length === 3 && startsOn && endsOn
    && Number.isFinite(Date.parse(startsOn)) && Number.isFinite(Date.parse(endsOn)) && endsOn >= startsOn) {
    return { kind, startsOn, endsOn };
  }
  return null;
}

export function mealPlanRecipeCandidate(
  recipe: Record<string, unknown>, candidateId: string, plannedPortions: number,
): Record<string, unknown> | null {
  const version = record(recipe.version); const provenance = record(recipe.provenance);
  const recipeId = text(recipe.recipeId); const recipeVersionId = text(version?.id);
  const title = text(version?.title); const ownerPersonId = text(recipe.ownerPersonId);
  if (!version || !provenance || !recipeId || !recipeVersionId || !title || !ownerPersonId) return null;
  return {
    id: candidateId, kind: 'recipe', title,
    recipeSnapshot: {
      recipeId, recipeVersionId, recipeVersion: version.version, contentHash: version.contentHash ?? null,
      ingredients: Array.isArray(version.ingredients) ? version.ingredients.map((value) => {
        const ingredient = record(value);
        return { id: ingredient?.id, originalText: ingredient?.originalText, optional: ingredient?.optional === true };
      }) : [],
      equipmentSuggestions: Array.isArray(version.equipmentRequirements) ? version.equipmentRequirements : [],
      title, yieldQuantity: version.yieldQuantity ?? null, yieldUnit: version.yieldUnit ?? null,
      recipeScaleMultiplier: 1, plannedPortions, selectedServings: plannedPortions,
      dinerPersonIds: [], excludedDinerPersonIds: [], excludedDinerResolution: null,
      ownerPersonId, sourceType: provenance.method,
      sourceAttribution: Array.isArray(recipe.credits)
        ? text(record((recipe.credits as unknown[]).find((credit) => text(record(credit)?.displayLabel)))?.displayLabel)
        : null,
      media: null,
    },
  };
}
