import {
  RECIPE_IMAGE_MODEL,
  RECIPE_IMAGE_QUALITY,
  RECIPE_IMAGE_SIZE,
} from "./recipeImagePipeline.ts";

export type RecipeImageQa = {
  identityScore: number;
  ingredientFidelityScore: number;
  structureScore: number;
  cropScore: number;
  artifactScore: number;
  hardFailures: string[];
  summary: string;
  altText: string;
};

export function buildImageGenerationRequest(prompt: string) {
  const normalized = prompt.trim();
  if (!normalized || normalized.length > 20_000) throw new Error("invalid_prompt");
  return {
    model: RECIPE_IMAGE_MODEL,
    prompt: normalized,
    n: 1,
    size: RECIPE_IMAGE_SIZE,
    quality: RECIPE_IMAGE_QUALITY,
    output_format: "webp" as const,
    output_compression: 85,
  };
}

export function verifyWebpEnvelope(bytes: Uint8Array): boolean {
  if (bytes.length < 12 || bytes.length > 12_582_912) return false;
  const decoder = new TextDecoder("ascii");
  return decoder.decode(bytes.slice(0, 4)) === "RIFF" && decoder.decode(bytes.slice(8, 12)) === "WEBP";
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function parseRecipeImageQueuePolicy(value: unknown, now = new Date()): {
  maxAttempts: number;
  availableAt: string;
} {
  const input = record(value);
  if (!input) throw new Error("invalid_request");
  const maxAttempts = Number.isInteger(input.maxAttempts) ? Number(input.maxAttempts) : 3;
  if (maxAttempts < 1 || maxAttempts > 3) throw new Error("invalid_max_attempts");
  const availableAt = typeof input.availableAt === "string" ? new Date(input.availableAt) : now;
  if (Number.isNaN(availableAt.getTime())) throw new Error("invalid_available_at");
  return { maxAttempts, availableAt: availableAt.toISOString() };
}

function score(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) throw new Error(`invalid_${field}`);
  return value;
}

function text(value: unknown, field: string, minimum: number, maximum: number): string {
  if (typeof value !== "string") throw new Error(`invalid_${field}`);
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < minimum || normalized.length > maximum) throw new Error(`invalid_${field}`);
  return normalized;
}

export function parseRecipeImageQa(value: unknown): RecipeImageQa {
  const input = record(value);
  if (!input) throw new Error("invalid_qa");
  const failures = Array.isArray(input.hardFailures)
    ? input.hardFailures.map((failure) => text(failure, "hard_failure", 3, 240)).slice(0, 10)
    : null;
  if (!failures) throw new Error("invalid_hard_failures");
  return {
    identityScore: score(input.identityScore, "identity_score"),
    ingredientFidelityScore: score(input.ingredientFidelityScore, "ingredient_fidelity_score"),
    structureScore: score(input.structureScore, "structure_score"),
    cropScore: score(input.cropScore, "crop_score"),
    artifactScore: score(input.artifactScore, "artifact_score"),
    hardFailures: [...new Set(failures)],
    summary: text(input.summary, "summary", 3, 600),
    altText: text(input.altText, "alt_text", 20, 500),
  };
}

export function decideRecipeImageQa(qa: RecipeImageQa): { status: "editorial_review" | "rejected"; reasons: string[] } {
  const reasons = [...qa.hardFailures];
  if (qa.identityScore < 4) reasons.push("dish identity below threshold");
  if (qa.ingredientFidelityScore < 4) reasons.push("ingredient fidelity below threshold");
  if (qa.structureScore < 3) reasons.push("food structure below threshold");
  if (qa.cropScore < 3) reasons.push("crop safety below threshold");
  if (qa.artifactScore < 4) reasons.push("visual artifacts above threshold");
  return reasons.length ? { status: "rejected", reasons: [...new Set(reasons)] } : { status: "editorial_review", reasons: [] };
}

type EditorialChecks = {
  recognizable: boolean;
  ingredientFaithful: boolean;
  culturallyPlausible: boolean;
  cropSafe: boolean;
  artifactFree: boolean;
};

export function validateRecipeImageReview(value: unknown): {
  decision: "approve" | "reject";
  checks: EditorialChecks | null;
  altText: string | null;
  reasons: string[];
  publish: boolean;
} {
  const input = record(value);
  if (!input || (input.decision !== "approve" && input.decision !== "reject")) throw new Error("invalid_review_decision");
  if (input.decision === "reject") {
    const reasons = Array.isArray(input.reasons)
      ? input.reasons.map((reason) => text(reason, "rejection_reason", 3, 240)).slice(0, 20)
      : [];
    if (!reasons.length) throw new Error("rejection_reason_required");
    return { decision: "reject", checks: null, altText: null, reasons, publish: false };
  }
  const rawChecks = record(input.checks);
  const keys: (keyof EditorialChecks)[] = ["recognizable", "ingredientFaithful", "culturallyPlausible", "cropSafe", "artifactFree"];
  if (!rawChecks || keys.some((key) => rawChecks[key] !== true)) throw new Error("editorial_checks_required");
  const checks = Object.fromEntries(keys.map((key) => [key, true])) as EditorialChecks;
  return {
    decision: "approve",
    checks,
    altText: text(input.altText, "alt_text", 20, 500),
    reasons: [],
    publish: input.publish === true,
  };
}
