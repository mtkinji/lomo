type JsonRecord = Record<string, unknown>;
function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null;
}
function stringField(input: JsonRecord, name: string, maximum: number, required = true): string | null {
  const value = typeof input[name] === 'string' ? input[name].trim().replace(/\s+/g, ' ') : '';
  if ((required && !value) || value.length > maximum) throw new Error(`invalid_${name}`);
  return value || null;
}

export function parseRecipeCatalogSource(value: unknown) {
  const input = asRecord(value);
  if (!input) throw new Error("invalid_recipe_source");
  const rosterId = stringField(input, "rosterId", 5)!.toUpperCase();
  if (!/^[A-Z]{2}[0-9]{3}$/.test(rosterId)) throw new Error("invalid_roster_id");
  const ingredients = Array.isArray(input.ingredients)
    ? input.ingredients.map((line) => typeof line === "string" ? line.trim() : "").filter(Boolean).slice(0, 200)
    : [];
  const scalingState = ['verified', 'unavailable', 'review_required'].includes(String(input.scalingState))
    ? String(input.scalingState)
    : 'review_required';
  const structuredIngredients = Array.isArray(input.structuredIngredients)
    ? input.structuredIngredients.map((value, position) => {
      const line = asRecord(value);
      const scaleRule = asRecord(line?.scaleRule);
      const validRule = ((scaleRule?.kind === 'multiply' || scaleRule?.kind === 'review_required') && Object.keys(scaleRule).length === 1)
        || (scaleRule?.kind === 'fixed' && Object.keys(scaleRule).length === 2 && ['as_needed', 'garnish', 'to_taste', 'vessel', 'reviewed_other'].includes(String(scaleRule.reason)));
      if (!line || line.position !== position || line.originalText !== ingredients[position] || !validRule) {
        throw new Error('invalid_structured_ingredient');
      }
      const numeric = (name: string, maximum: number): number | null => {
        const value = line[name];
        if (value == null) return null;
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > maximum) throw new Error('invalid_structured_ingredient');
        return value;
      };
      const quantityMin = numeric('quantityMin', 100_000);
      const quantityMax = numeric('quantityMax', 100_000);
      if (quantityMax !== null && (quantityMin === null || quantityMax < quantityMin)) throw new Error('invalid_structured_ingredient');
      if (line.optional !== undefined && typeof line.optional !== 'boolean') throw new Error('invalid_structured_ingredient');
      const nullableText = (name: string, maximum: number): string | null => {
        if (line[name] == null) return null;
        if (typeof line[name] !== 'string' || line[name].length > maximum) throw new Error('invalid_structured_ingredient');
        return line[name].trim() || null;
      };
      const parsed = {
        position, originalText: line.originalText,
        quantityMin, quantityMax, unit: nullableText('unit', 80),
        ingredientConcept: nullableText('ingredientConcept', 240), preparation: nullableText('preparation', 320),
        optional: line.optional ?? /\boptional\b/i.test(String(line.originalText)),
        parseConfidence: numeric('parseConfidence', 1), scaleRule,
      };
      // A scale-only legacy request must not erase reviewed data on republish.
      for (const name of ['quantityMin', 'quantityMax', 'unit', 'ingredientConcept', 'preparation', 'optional', 'parseConfidence'] as const) {
        if (line[name] === undefined) delete (parsed as Partial<typeof parsed>)[name];
      }
      return parsed;
    })
    : [];
  const instructions = Array.isArray(input.instructions)
    ? input.instructions.map((line) => typeof line === "string" ? line.trim() : "").filter(Boolean).slice(0, 200)
    : [];
  if (ingredients.length < 5 || instructions.length < 4 || structuredIngredients.length !== ingredients.length) throw new Error("incomplete_recipe_source");
  return {
    rosterId,
    publicSlug: stringField(input, "publicSlug", 160)!,
    title: stringField(input, "title", 160)!,
    description: stringField(input, "description", 4000, false),
    category: stringField(input, "category", 120)!,
    cuisine: stringField(input, "cuisine", 160)!,
    tier: stringField(input, "tier", 80, false),
    contentHash: stringField(input, "contentHash", 256)!,
    imageDirection: stringField(input, "imageDirection", 1200, false),
    yieldQuantity: typeof input.yieldQuantity === "number" ? input.yieldQuantity : null,
    yieldUnit: stringField(input, "yieldUnit", 80, false),
    prepMinutes: Number.isInteger(input.prepMinutes) ? input.prepMinutes : null,
    cookMinutes: Number.isInteger(input.cookMinutes) ? input.cookMinutes : null,
    notes: stringField(input, "notes", 20_000, false),
    ingredients,
    scalingState,
    structuredIngredients,
    instructions,
  };
}

