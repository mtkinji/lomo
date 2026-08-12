import {
  buildImageGenerationRequest,
  decideRecipeImageQa,
  parseRecipeImageQa,
  parseRecipeImageQueuePolicy,
  validateRecipeImageReview,
  verifyWebpEnvelope,
} from "../recipeImageAdmin.ts";
import { RECIPE_IMAGE_MODEL, RECIPE_IMAGE_QUALITY, RECIPE_IMAGE_SIZE } from "../recipeImagePipeline.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("image request stays pinned to the approved model and landscape contract", () => {
  const request = buildImageGenerationRequest("truthful recipe prompt");
  assert(request.model === RECIPE_IMAGE_MODEL, "model drifted");
  assert(request.size === RECIPE_IMAGE_SIZE, "size drifted");
  assert(request.quality === RECIPE_IMAGE_QUALITY, "quality drifted");
  assert(request.output_format === "webp", "format drifted");
  assert(request.n === 1, "only one candidate belongs in each job");
});

Deno.test("WebP envelope rejects mislabeled or empty output", () => {
  const valid = new Uint8Array(16);
  valid.set(new TextEncoder().encode("RIFF"), 0);
  valid.set(new TextEncoder().encode("WEBP"), 8);
  assert(verifyWebpEnvelope(valid), "valid WebP envelope rejected");
  assert(!verifyWebpEnvelope(new TextEncoder().encode("not-an-image")), "invalid image accepted");
});

Deno.test("queue policy preserves weekly release time and bounded paid attempts", () => {
  const policy = parseRecipeImageQueuePolicy({ maxAttempts: 1, availableAt: "2026-08-19T15:20:00Z" });
  assert(policy.maxAttempts === 1, "paid-attempt ceiling drifted");
  assert(policy.availableAt === "2026-08-19T15:20:00.000Z", "weekly release time drifted");
  let rejected = false;
  try {
    parseRecipeImageQueuePolicy({ maxAttempts: 4, availableAt: "not-a-date" });
  } catch {
    rejected = true;
  }
  assert(rejected, "invalid queue policy was accepted");
});

Deno.test("semantic QA parser is strict and bounded", () => {
  const qa = parseRecipeImageQa({
    identityScore: 5,
    ingredientFidelityScore: 4,
    structureScore: 4,
    cropScore: 5,
    artifactScore: 5,
    hardFailures: [],
    summary: "Recognizable and faithful.",
    altText: "A shallow bowl of red chilaquiles with crema and onion.",
  });
  assert(qa.identityScore === 5, "identity score missing");
  assert(qa.altText.startsWith("A shallow"), "alt text missing");
  let rejected = false;
  try {
    parseRecipeImageQa({ identityScore: 9 });
  } catch {
    rejected = true;
  }
  assert(rejected, "malformed QA was accepted");
});

Deno.test("semantic QA only advances faithful candidates", () => {
  const passing = parseRecipeImageQa({
    identityScore: 4,
    ingredientFidelityScore: 4,
    structureScore: 4,
    cropScore: 3,
    artifactScore: 4,
    hardFailures: [],
    summary: "Pass.",
    altText: "A finished dish on a ceramic plate.",
  });
  assert(decideRecipeImageQa(passing).status === "editorial_review", "good candidate did not advance");
  assert(
    decideRecipeImageQa({ ...passing, hardFailures: ["unsupported main ingredient"] }).status === "rejected",
    "hard failure did not reject",
  );
});

Deno.test("human approval requires each editorial check and meaningful alt text", () => {
  const approved = validateRecipeImageReview({
    decision: "approve",
    checks: { recognizable: true, ingredientFaithful: true, culturallyPlausible: true, cropSafe: true, artifactFree: true },
    altText: "Chilaquiles rojos on a shallow ceramic plate with crema and sliced onion.",
    publish: true,
  });
  assert(approved.decision === "approve" && approved.publish, "approval rejected");
  let rejected = false;
  try {
    validateRecipeImageReview({
      decision: "approve",
      checks: { recognizable: true, ingredientFaithful: false, culturallyPlausible: true, cropSafe: true, artifactFree: true },
      altText: "Too short",
    });
  } catch {
    rejected = true;
  }
  assert(rejected, "incomplete approval accepted");
});
