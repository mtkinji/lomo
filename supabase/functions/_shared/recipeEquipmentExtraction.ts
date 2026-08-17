export type ExtractedRecipeEquipmentRequirement = {
  id: string;
  label: string;
  searchQuery: string;
  necessity: 'required' | 'preferred';
  confidence: number;
  evidenceText: string;
  substitute: string | null;
};

const MAX_EQUIPMENT_REQUIREMENTS = 24;

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function buildRecipeImportExtractionSchema(): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'title', 'description', 'yieldQuantity', 'yieldUnit', 'prepMinutes', 'cookMinutes',
      'ingredients', 'instructions', 'equipmentRequirements', 'sourceTitle', 'sourceAuthor',
      'fieldEvidence', 'warnings',
    ],
    properties: {
      title: { type: 'string' },
      description: { type: ['string', 'null'] },
      yieldQuantity: { type: ['number', 'null'] },
      yieldUnit: { type: ['string', 'null'] },
      prepMinutes: { type: ['integer', 'null'] },
      cookMinutes: { type: ['integer', 'null'] },
      sourceTitle: { type: ['string', 'null'] },
      sourceAuthor: { type: ['string', 'null'] },
      ingredients: {
        type: 'array', maxItems: 200,
        items: { type: 'object', additionalProperties: false, required: ['originalText'], properties: { originalText: { type: 'string' } } },
      },
      instructions: {
        type: 'array', maxItems: 200,
        items: { type: 'object', additionalProperties: false, required: ['text'], properties: { text: { type: 'string' } } },
      },
      equipmentRequirements: {
        type: 'array', maxItems: MAX_EQUIPMENT_REQUIREMENTS,
        items: {
          type: 'object', additionalProperties: false,
          required: ['id', 'label', 'searchQuery', 'necessity', 'confidence', 'evidenceText', 'substitute'],
          properties: {
            id: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
            label: { type: 'string' },
            searchQuery: { type: 'string' },
            necessity: { type: 'string', enum: ['required', 'preferred'] },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            evidenceText: { type: 'string' },
            substitute: { type: ['string', 'null'] },
          },
        },
      },
      fieldEvidence: {
        type: 'array', maxItems: 1000,
        items: {
          type: 'object', additionalProperties: false,
          required: ['fieldPath', 'sourceText', 'confidence', 'warning'],
          properties: {
            fieldPath: { type: 'string' }, sourceText: { type: ['string', 'null'] },
            confidence: { type: 'number', minimum: 0, maximum: 1 }, warning: { type: ['string', 'null'] },
          },
        },
      },
      warnings: { type: 'array', maxItems: 50, items: { type: 'string' } },
    },
  };
}

export function recipeImportExtractionInstruction(evidence: string): string {
  return `Extract only facts visible in the supplied recipe evidence. Preserve ingredient and instruction wording. Use null when unknown. Every inferred field must have fieldEvidence, confidence, and a warning when uncertain. Never invent an author, time, yield, quantity, or ingredient.

For equipmentRequirements, include only specialized kitchen tools or appliances that the recipe actually calls for. Exclude ordinary basics such as an oven, stovetop, pot, skillet, bowl, spoon, knife, cutting board, baking sheet, and measuring cups. Mark an item preferred when it is optional or the recipe gives a workable substitute. Preserve meaningful size or capacity in label and searchQuery. evidenceText must be an exact quote from one extracted instruction. Use a stable lowercase kebab-case concept id. Do not infer that the household lacks the item.

Evidence:
${evidence.slice(0, 50_000)}`;
}

export function validateRecipeEquipmentRequirements(
  value: unknown,
  instructions: readonly string[],
): ExtractedRecipeEquipmentRequirement[] {
  if (!Array.isArray(value)) return [];
  const normalizedInstructions = instructions.map(normalize);
  return value.slice(0, MAX_EQUIPMENT_REQUIREMENTS).flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id.trim().slice(0, 80) : '';
    const label = typeof row.label === 'string' ? row.label.trim().slice(0, 160) : '';
    const searchQuery = typeof row.searchQuery === 'string' ? row.searchQuery.trim().slice(0, 240) : '';
    const evidenceText = typeof row.evidenceText === 'string' ? row.evidenceText.trim().slice(0, 8_000) : '';
    const confidence = typeof row.confidence === 'number' ? row.confidence : -1;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !label || !searchQuery || !evidenceText) return [];
    if (row.necessity !== 'required' && row.necessity !== 'preferred') return [];
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) return [];
    if (!normalizedInstructions.some((instruction) => instruction.includes(normalize(evidenceText)))) return [];
    const substitute = typeof row.substitute === 'string' && row.substitute.trim()
      ? row.substitute.trim().slice(0, 160)
      : null;
    return [{ id, label, searchQuery, necessity: row.necessity, confidence, evidenceText, substitute }];
  });
}
