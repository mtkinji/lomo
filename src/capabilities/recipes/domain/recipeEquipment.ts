export type RecipeEquipmentNecessity = 'required' | 'preferred';

export type SpecializedRecipeEquipment = {
  id: string;
  label: string;
  searchQuery: string;
  necessity: RecipeEquipmentNecessity;
  confidence: number;
  evidenceText: string | null;
  substitute: string | null;
};

const MAX_RECIPE_EQUIPMENT_REQUIREMENTS = 24;

function normalizedEvidence(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function parseEquipmentRequirement(value: unknown, path: string): SpecializedRecipeEquipment {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path} must be an object.`);
  const row = value as Record<string, unknown>;
  const allowed = new Set(['id', 'label', 'searchQuery', 'necessity', 'confidence', 'evidenceText', 'substitute']);
  const unknown = Object.keys(row).find((key) => !allowed.has(key));
  if (unknown) throw new Error(`${path}.${unknown} is not supported.`);
  const requiredText = (key: 'id' | 'label' | 'searchQuery' | 'evidenceText', max: number) => {
    const text = row[key];
    if (typeof text !== 'string' || !text.trim() || text.length > max) throw new Error(`${path}.${key} is invalid.`);
    return text.trim();
  };
  const id = requiredText('id', 80);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(`${path}.id is invalid.`);
  if (row.necessity !== 'required' && row.necessity !== 'preferred') throw new Error(`${path}.necessity is invalid.`);
  if (typeof row.confidence !== 'number' || !Number.isFinite(row.confidence) || row.confidence < 0 || row.confidence > 1) {
    throw new Error(`${path}.confidence is invalid.`);
  }
  if (row.substitute !== null && (typeof row.substitute !== 'string' || !row.substitute.trim() || row.substitute.length > 160)) {
    throw new Error(`${path}.substitute is invalid.`);
  }
  return {
    id,
    label: requiredText('label', 160),
    searchQuery: requiredText('searchQuery', 240),
    necessity: row.necessity,
    confidence: row.confidence,
    evidenceText: requiredText('evidenceText', 8_000),
    substitute: typeof row.substitute === 'string' ? row.substitute.trim() : null,
  };
}

export function parseRecipeEquipmentRequirements(
  value: unknown,
  instructions: readonly string[],
): SpecializedRecipeEquipment[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_RECIPE_EQUIPMENT_REQUIREMENTS) {
    throw new Error(`equipmentRequirements must contain at most ${MAX_RECIPE_EQUIPMENT_REQUIREMENTS} entries.`);
  }
  const instructionEvidence = instructions.map(normalizedEvidence);
  const requirements = value.map((item, index) => parseEquipmentRequirement(item, `equipmentRequirements[${index}]`));
  for (const [index, requirement] of requirements.entries()) {
    const evidence = normalizedEvidence(requirement.evidenceText ?? '');
    if (!instructionEvidence.some((instruction) => instruction.includes(evidence))) {
      throw new Error(`equipmentRequirements[${index}].evidenceText must quote a reviewed instruction.`);
    }
  }
  return requirements;
}

export function sanitizeRecipeEquipmentRequirements(
  value: unknown,
  instructions: readonly string[],
): SpecializedRecipeEquipment[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_RECIPE_EQUIPMENT_REQUIREMENTS).flatMap((item) => {
    try { return parseRecipeEquipmentRequirements([item], instructions); }
    catch { return []; }
  });
}

type EquipmentAlternative = { label: string; pattern: RegExp };
type EquipmentRule = {
  id: string;
  label: string;
  searchLabel: string;
  pattern: RegExp;
  alternatives?: readonly EquipmentAlternative[];
};

const SPECIALIZED_EQUIPMENT_RULES: readonly EquipmentRule[] = [
  { id: 'immersion-blender', label: 'Immersion blender', searchLabel: 'immersion blender', pattern: /\b(?:immersion|stick) blender\b/i, alternatives: [{ label: 'Countertop blender', pattern: /\b(?:countertop|regular) blender\b/i }] },
  { id: 'food-processor', label: 'Food processor', searchLabel: 'food processor', pattern: /\bfood processor\b/i, alternatives: [{ label: 'Knife', pattern: /\b(?:knife|chop(?:ped|ping)? by hand)\b/i }] },
  { id: 'stand-mixer', label: 'Stand mixer', searchLabel: 'stand mixer', pattern: /\bstand mixer\b/i, alternatives: [{ label: 'Knead by hand', pattern: /\bknead(?:ed|ing)? by hand\b/i }] },
  { id: 'hand-mixer', label: 'Hand mixer', searchLabel: 'hand mixer', pattern: /\bhand mixer\b/i },
  { id: 'kitchen-scale', label: 'Kitchen scale', searchLabel: 'kitchen scale', pattern: /\b(?:kitchen|digital) scale\b/i, alternatives: [{ label: 'Measuring cups', pattern: /\bmeasuring cups?\b/i }] },
  { id: 'dutch-oven', label: 'Dutch oven', searchLabel: 'Dutch oven', pattern: /\bdutch oven\b/i },
  { id: 'pressure-cooker', label: 'Pressure cooker', searchLabel: 'pressure cooker', pattern: /\b(?:pressure cooker|instant pot)\b/i },
  { id: 'slow-cooker', label: 'Slow cooker', searchLabel: 'slow cooker', pattern: /\b(?:slow cooker|crock[ -]?pot)\b/i },
  { id: 'cast-iron-skillet', label: 'Cast-iron skillet', searchLabel: 'cast iron skillet', pattern: /\bcast[ -]?iron skillet\b/i },
  { id: 'wok', label: 'Wok', searchLabel: 'wok', pattern: /\bwok\b/i },
  { id: 'springform-pan', label: 'Springform pan', searchLabel: 'springform pan', pattern: /\bspringform pan\b/i },
  { id: 'bundt-pan', label: 'Bundt pan', searchLabel: 'bundt pan', pattern: /\bbundt pan\b/i },
  { id: 'loaf-pan', label: 'Loaf pan', searchLabel: 'loaf pan', pattern: /\bloaf pan\b/i },
  { id: 'muffin-tin', label: 'Muffin tin', searchLabel: 'muffin tin', pattern: /\b(?:muffin|cupcake) (?:tin|pan)\b/i },
  { id: 'kitchen-thermometer', label: 'Kitchen thermometer', searchLabel: 'kitchen thermometer', pattern: /\b(?:instant-read|candy|deep-fry|meat|kitchen) thermometer\b/i },
  { id: 'rolling-pin', label: 'Rolling pin', searchLabel: 'rolling pin', pattern: /\brolling pin\b/i, alternatives: [{ label: 'Bottle', pattern: /\b(?:wine |glass )?bottle\b/i }] },
  { id: 'mortar-and-pestle', label: 'Mortar and pestle', searchLabel: 'mortar and pestle', pattern: /\bmortar and pestle\b/i, alternatives: [{ label: 'Spice grinder', pattern: /\bspice grinder\b/i }] },
  { id: 'mandoline', label: 'Mandoline', searchLabel: 'mandoline slicer', pattern: /\bmandoline(?: slicer)?\b/i, alternatives: [{ label: 'Knife', pattern: /\bknife\b/i }] },
  { id: 'steamer-basket', label: 'Steamer basket', searchLabel: 'steamer basket', pattern: /\bsteamer basket\b/i },
  { id: 'roasting-rack', label: 'Roasting rack', searchLabel: 'roasting rack', pattern: /\broasting rack\b/i },
  { id: 'piping-bag', label: 'Piping bag', searchLabel: 'piping bag', pattern: /\b(?:piping|pastry) bag\b/i },
];

const OPTIONAL_EQUIPMENT_CUE = /\b(?:optional|if you have|if available|if desired|no special equipment|not required)\b/i;
const REJECTED_USE_CUE = /\b(?:avoid|never use|do not use|don't use|no need for)\b/i;
const DIRECT_REJECTION_CUE = /\b(?:without|instead of)\s+(?:an?\s+)?$/i;
const PREFERRED_EQUIPMENT_CUE = /\b(?:for best results|recommended|ideally|easier with|works best with)\b/i;
const ALTERNATIVE_LINK_CUE = /(?:,|;)\s*or\b|\bor alternatively\b|\beither\b/i;
const MEASUREMENT_SUFFIX = /((?:\d+(?:[./]\d+)?|\d+\s+\d+\/\d+)\s*(?:-|–|—|\s)?(?:inch(?:es)?|in\.?|["”]|quart(?:s)?|qt\.?|cup(?:s)?))\s*[- ]*$/i;

function findSpecification(segment: string, matchIndex: number): string | null {
  const prefix = segment.slice(Math.max(0, matchIndex - 40), matchIndex);
  return MEASUREMENT_SUFFIX.exec(prefix)?.[1]?.trim().replace(/\s+/g, ' ') ?? null;
}

function evidenceForSegment(segment: string, rule: EquipmentRule, matchIndex: number): SpecializedRecipeEquipment {
  const specification = findSpecification(segment, matchIndex);
  const alternative = ALTERNATIVE_LINK_CUE.test(segment)
    ? rule.alternatives?.find((candidate) => candidate.pattern.test(segment)) ?? null
    : null;
  const necessity: RecipeEquipmentNecessity = alternative || PREFERRED_EQUIPMENT_CUE.test(segment)
    ? 'preferred'
    : 'required';
  const searchQuery = `${specification ? `${specification} ` : ''}${rule.searchLabel}`;
  return {
    id: rule.id,
    label: specification ? searchQuery : rule.label,
    searchQuery,
    necessity,
    confidence: 1,
    evidenceText: segment,
    substitute: alternative?.label ?? null,
  };
}

function rejectsMatchedEquipment(segment: string, matchIndex: number): boolean {
  const prefix = segment.slice(0, matchIndex);
  return REJECTED_USE_CUE.test(prefix)
    || DIRECT_REJECTION_CUE.test(prefix.slice(Math.max(0, prefix.length - 40)));
}

export function deriveSpecializedRecipeEquipment(instructions: readonly string[]): SpecializedRecipeEquipment[] {
  const equipment = new Map<string, SpecializedRecipeEquipment>();
  const segments = instructions.flatMap((instruction) =>
    instruction.split(/(?<=[.!?;])\s+|\n+/).map((part) => part.trim()).filter(Boolean),
  );

  for (const segment of segments) {
    if (OPTIONAL_EQUIPMENT_CUE.test(segment)) continue;
    for (const rule of SPECIALIZED_EQUIPMENT_RULES) {
      const match = rule.pattern.exec(segment);
      if (!match || rejectsMatchedEquipment(segment, match.index)) continue;
      const candidate = evidenceForSegment(segment, rule, match.index);
      const current = equipment.get(rule.id);
      if (!current || (current.necessity === 'preferred' && candidate.necessity === 'required')) {
        equipment.set(rule.id, candidate);
      }
    }
  }

  return [...equipment.values()];
}
