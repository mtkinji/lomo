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

export function buildRecipeImageQaInstructions(): string {
  return [
    "You are a strict cookbook photo editor. Judge only visible evidence.",
    "All five score fields use this same direction: 5 = excellent, 4 = good, 3 = borderline, 2 = major problems, and 1 = severe failure.",
    "A high score is always better, including artifactScore and cropScore.",
    "Do not assign 1 to an acceptable image. Use 1 only when the named dimension has a severe visible failure.",
    "Judge ingredient fidelity from the dish-defining ingredients and structure. Do not penalize the exact visible count of supporting serving accompaniments, such as breads, rice portions, lemon wedges, or condiments; a representative amount may be visible or safely outside the crop.",
    "List hardFailures only for visible disqualifying problems. The written summary, hardFailures, and numeric scores must agree.",
  ].join(" ");
}

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

export function parseRecipeImageIngest(value: unknown): {
  jobId: string;
  bytes: Uint8Array;
  altText: string;
  generator: 'codex-built-in-imagegen';
} {
  const input = record(value);
  if (!input) throw new Error('invalid_request');
  const jobId = typeof input.jobId === 'string' ? input.jobId.trim().toLowerCase() : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(jobId)) {
    throw new Error('invalid_job_id');
  }
  if (input.generator !== 'codex-built-in-imagegen') throw new Error('invalid_generator');
  const encoded = typeof input.imageBase64 === 'string' ? input.imageBase64 : '';
  if (!encoded || encoded.length > 16_800_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new Error('invalid_image_output');
  }
  let binary = '';
  try {
    binary = atob(encoded);
  } catch {
    throw new Error('invalid_image_output');
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (!verifyWebpEnvelope(bytes)) throw new Error('invalid_webp_output');
  return {
    jobId,
    bytes,
    altText: text(input.altText, 'alt_text', 20, 500),
    generator: 'codex-built-in-imagegen',
  };
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

export function parseRecipeImageListFilters(value: unknown): {
  status: string;
  limit: number;
  rosterIds: string[] | null;
  promptVersion: string | null;
} {
  const input = record(value);
  if (!input) throw new Error("invalid_request");
  const status = typeof input.status === "string" ? input.status.trim() : "editorial_review";
  if (!/^[a-z_]{3,40}$/.test(status)) throw new Error("invalid_status");
  const limit = Number.isInteger(input.limit) ? Math.max(1, Math.min(250, Number(input.limit))) : 100;
  const rosterIds = input.rosterIds == null ? null : Array.isArray(input.rosterIds)
    ? [...new Set(input.rosterIds.map((rosterId) => typeof rosterId === "string" ? rosterId.trim().toUpperCase() : ""))]
    : null;
  if (input.rosterIds != null && (!rosterIds || rosterIds.length < 1 || rosterIds.length > 25 || rosterIds.some((rosterId) => !/^[A-Z]{2}\d{3}$/.test(rosterId)))) {
    throw new Error("invalid_roster_ids");
  }
  const promptVersion = input.promptVersion == null ? null : typeof input.promptVersion === "string"
    ? input.promptVersion.trim().toLowerCase()
    : "";
  if (promptVersion !== null && !/^[a-z0-9-]{3,120}$/.test(promptVersion)) throw new Error("invalid_prompt_version");
  return { status, limit, rosterIds, promptVersion };
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
