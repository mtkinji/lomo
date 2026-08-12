export const RECIPE_IMAGE_PROMPT_VERSION = "kwilt-recipe-hero-v1";
export const RECIPE_IMAGE_MODEL = "gpt-image-2-2026-04-21";
export const RECIPE_IMAGE_SIZE = "1536x1024";
export const RECIPE_IMAGE_QUALITY = "medium";

export type RecipeImageSource = {
  rosterId: string;
  title: string;
  description: string | null;
  category: string;
  cuisine: string;
  contentHash: string;
  ingredients: string[];
  instructions: string[];
};

export type RecipeImageVisualBrief = {
  rosterId: string;
  dish: string;
  description: string | null;
  category: string;
  cuisine: string;
  recipeContentHash: string;
  requiredIngredientEvidence: string[];
  optionalIngredientEvidence: string[];
  methodEvidence: string[];
  textureEvidence: string[];
  finalPresentationEvidence: string[];
  mustNotShow: string[];
};

export type RecipeImageJobStatus =
  | "missing"
  | "queued"
  | "generating"
  | "generated"
  | "qa_checking"
  | "editorial_review"
  | "approved"
  | "published"
  | "rejected"
  | "failed";

const PANTRY_ONLY = /^(?:\d+(?:[./]\d+)?\s*)?(?:teaspoons?|tablespoons?|cups?|ounces?|pounds?|grams?|kilograms?|ml|liters?|pinch(?:es)?|to taste)?\s*(?:of\s+)?(?:kosher |sea |fine )?salt(?: and (?:black )?pepper)?(?:,.*)?$/i;
const OPTIONAL = /\boptional\b/i;
const METHOD_PATTERN = /\b(?:bake|baked|braise|braised|broil|broiled|char|charred|fry|fried|grill|grilled|poach|poached|roast|roasted|simmer|simmered|steam|steamed|stew|stewed|toast|toasted)\b/gi;
const TEXTURE_PATTERN = /\b(?:bubbled|caramelized|charred|chewy|crisp|crispy|crunchy|flaky|glossy|golden|jammy|juicy|silky|softened|tender)\b/gi;

function cleanEvidence(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 600);
}

function uniqueMatches(values: string[], pattern: RegExp, limit: number): string[] {
  const matches = values.flatMap((value) => value.match(pattern) ?? []).map((value) => value.toLowerCase());
  return [...new Set(matches)].slice(0, limit);
}

export function buildRecipeImageVisualBrief(source: RecipeImageSource): RecipeImageVisualBrief {
  const ingredients = source.ingredients.map(cleanEvidence).filter(Boolean);
  const requiredIngredientEvidence = ingredients
    .filter((line) => !OPTIONAL.test(line) && !PANTRY_ONLY.test(line))
    .slice(0, 14);
  const optionalIngredientEvidence = ingredients.filter((line) => OPTIONAL.test(line)).slice(0, 6);
  const instructions = source.instructions.map(cleanEvidence).filter(Boolean);
  return {
    rosterId: source.rosterId.trim().toUpperCase(),
    dish: cleanEvidence(source.title),
    description: source.description ? cleanEvidence(source.description) : null,
    category: cleanEvidence(source.category),
    cuisine: cleanEvidence(source.cuisine),
    recipeContentHash: cleanEvidence(source.contentHash),
    requiredIngredientEvidence,
    optionalIngredientEvidence,
    methodEvidence: uniqueMatches(instructions, METHOD_PATTERN, 8),
    textureEvidence: uniqueMatches(instructions, TEXTURE_PATTERN, 8),
    finalPresentationEvidence: instructions.slice(-2),
    mustNotShow: [
      "ingredients not supported by the recipe evidence",
      "hands or people",
      "text, logos, labels, or packaging",
      "physically impossible food structure",
      "excessive decorative garnish",
    ],
  };
}

function list(label: string, values: string[]): string {
  return `${label}:\n${values.length ? values.map((value) => `- ${value}`).join("\n") : "- none recorded"}`;
}

export function buildRecipeImagePrompt(brief: RecipeImageVisualBrief): string {
  return [
    `Prompt contract: ${RECIPE_IMAGE_PROMPT_VERSION}`,
    `Create one truthful studio-quality cookbook image of ${brief.dish}.`,
    `Cuisine context: ${brief.cuisine}. Meal context: ${brief.category}.`,
    brief.description ? `Recipe description: ${brief.description}` : "",
    list("Required ingredient evidence", brief.requiredIngredientEvidence),
    list("Optional ingredient evidence", brief.optionalIngredientEvidence),
    list("Cooking-method evidence", brief.methodEvidence),
    list("Texture evidence", brief.textureEvidence),
    list("Final plating and serving evidence", brief.finalPresentationEvidence),
    "Show one unmistakable finished dish derived only from this evidence. Preserve culturally plausible form, vessel, portion, ingredient relationships, and finishing style. Optional evidence must not become a defining component.",
    `Composition: ${RECIPE_IMAGE_SIZE} landscape, appetizing three-quarter or overhead food view as appropriate, with safe central 4:3 and square crops. Keep defining food away from the extreme edges.`,
    "House direction: believable home-cooked texture and portion, natural window light, quiet warm surface, restrained tableware, subtle natural imperfection, modern editorial cookbook quality, no synthetic gloss.",
    "No hands, people, text, logos, packaging, unsupported ingredients, excessive garnish, restaurant branding, or decorative cultural stereotypes.",
    list("Hard exclusions", brief.mustNotShow),
  ].filter(Boolean).join("\n\n");
}

export type RecipeImagePriorityInput = {
  artworkState: "missing" | "generic" | "specific";
  featured: boolean;
  activeCollectionPlacements: number;
  discoveryPosition: number | null;
  coverageGap: number;
  attemptCount: number;
};

export function buildRecipeImagePriority(input: RecipeImagePriorityInput): {
  total: number;
  breakdown: Record<"artwork" | "featured" | "collections" | "discovery" | "coverage" | "retry", number>;
} {
  const breakdown = {
    artwork: input.artworkState === "missing" ? 120 : input.artworkState === "generic" ? 100 : 0,
    featured: input.featured ? 25 : 0,
    collections: Math.min(3, Math.max(0, Math.floor(input.activeCollectionPlacements))) * 20,
    discovery: input.discoveryPosition == null ? 0 : Math.max(0, 30 - Math.max(0, input.discoveryPosition - 1) * 3),
    coverage: Math.min(5, Math.max(0, Math.floor(input.coverageGap))) * 15,
    retry: -Math.min(5, Math.max(0, Math.floor(input.attemptCount))) * 15,
  };
  return { total: Object.values(breakdown).reduce((sum, value) => sum + value, 0), breakdown };
}

const TRANSITIONS: Record<RecipeImageJobStatus, readonly RecipeImageJobStatus[]> = {
  missing: ["queued"],
  queued: ["generating", "rejected"],
  generating: ["generated", "queued", "failed"],
  generated: ["qa_checking", "editorial_review", "rejected", "failed"],
  qa_checking: ["editorial_review", "rejected", "generated", "failed"],
  editorial_review: ["approved", "rejected"],
  approved: ["published", "rejected"],
  published: ["rejected"],
  rejected: ["queued"],
  failed: ["queued"],
};

export function canTransitionRecipeImageJob(from: RecipeImageJobStatus, to: RecipeImageJobStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function parseGeneratedImage(payload: unknown): {
  bytes: Uint8Array;
  usage: { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null };
} {
  const record = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
  const data = Array.isArray(record?.data) ? record.data : [];
  const first = data[0] && typeof data[0] === "object" && !Array.isArray(data[0]) ? data[0] as Record<string, unknown> : null;
  const encoded = typeof first?.b64_json === "string" ? first.b64_json : "";
  if (!encoded) throw new Error("missing_image_output");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length > 24_000_000) throw new Error("invalid_image_output");
  let binary = "";
  try {
    binary = atob(encoded);
  } catch {
    throw new Error("invalid_image_output");
  }
  if (!binary.length) throw new Error("invalid_image_output");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const usage = record?.usage && typeof record.usage === "object" && !Array.isArray(record.usage)
    ? record.usage as Record<string, unknown>
    : {};
  return {
    bytes,
    usage: {
      inputTokens: numberOrNull(usage.input_tokens),
      outputTokens: numberOrNull(usage.output_tokens),
      totalTokens: numberOrNull(usage.total_tokens),
    },
  };
}

async function sha256(value: string | Uint8Array): Promise<string> {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildRecipeImageStoragePath(input: {
  rosterId: string;
  recipeContentHash: string;
  promptVersion: string;
  model: string;
  candidateIndex: number;
  bytes: Uint8Array;
}): Promise<string> {
  const rosterId = input.rosterId.trim().toLowerCase();
  if (!/^[a-z]{2}[0-9]{3}$/.test(rosterId)) throw new Error("invalid_roster_id");
  if (!Number.isInteger(input.candidateIndex) || input.candidateIndex < 0 || input.candidateIndex > 9) {
    throw new Error("invalid_candidate_index");
  }
  const promptVersion = input.promptVersion.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 80);
  const versionKey = (await sha256(`${input.recipeContentHash}|${input.promptVersion}|${input.model}`)).slice(0, 16);
  const imageKey = (await sha256(input.bytes)).slice(0, 16);
  return `catalog/${rosterId}/${promptVersion}/${versionKey}-${imageKey}/candidate-${input.candidateIndex}.webp`;
}
