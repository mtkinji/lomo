import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  RECIPE_IMAGE_MODEL,
  RECIPE_IMAGE_PROMPT_VERSION,
  buildRecipeImagePriority,
  buildRecipeImagePrompt,
  buildRecipeImageStoragePath,
  buildRecipeImageVisualBrief,
  canTransitionRecipeImageJob,
  parseGeneratedImage,
} from "../recipeImagePipeline.ts";

const source = {
  rosterId: "BR012",
  title: "Red salsa tortilla-and-egg skillet (Chilaquiles rojos)",
  description: "Fried tortilla pieces folded through red chile salsa and topped with eggs.",
  category: "Breakfast & brunch",
  cuisine: "Mexican",
  contentHash: "kwilt:BR012:v1",
  ingredients: [
    "12 corn tortillas, cut into irregular wedges",
    "2 cups red chile salsa",
    "4 pasteurized eggs",
    "1/2 cup Mexican crema, optional",
    "Kosher salt",
  ],
  instructions: [
    "Fry the tortilla wedges until crisp and drain well.",
    "Warm the salsa, fold in the chips briefly, and keep some crisp edges exposed.",
    "Top with fried eggs and optional crema, then serve immediately.",
  ],
};

Deno.test("visual brief preserves exact recipe evidence and marks optional ingredients", () => {
  const brief = buildRecipeImageVisualBrief(source);

  assertEquals(brief.dish, source.title);
  assertEquals(brief.rosterId, "BR012");
  assert(brief.requiredIngredientEvidence.some((line) => line.includes("corn tortillas")));
  assert(brief.requiredIngredientEvidence.some((line) => line.includes("red chile salsa")));
  assertEquals(brief.optionalIngredientEvidence, ["1/2 cup Mexican crema, optional"]);
  assert(!brief.requiredIngredientEvidence.some((line) => /kosher salt/i.test(line)));
  assertStringIncludes(brief.finalPresentationEvidence.join(" "), "crisp edges exposed");
  assert(brief.mustNotShow.includes("ingredients not supported by the recipe evidence"));
});

Deno.test("prompt is versioned, crop safe, culturally careful, and contains no private signals", () => {
  const prompt = buildRecipeImagePrompt(buildRecipeImageVisualBrief(source));

  assertStringIncludes(prompt, RECIPE_IMAGE_PROMPT_VERSION);
  assertStringIncludes(prompt, source.title);
  assertStringIncludes(prompt, "Mexican");
  assertStringIncludes(prompt, "1536x1024 landscape");
  assertStringIncludes(prompt, "safe central 4:3 and square crops");
  assertStringIncludes(prompt, "Optional evidence must not become a defining component");
  assertStringIncludes(prompt, "No hands, people, text, logos, packaging");
  assert(!/user|household|search query|favorite/i.test(prompt));
});

Deno.test("priority exposes an inspectable breakdown and penalizes retries", () => {
  const first = buildRecipeImagePriority({
    artworkState: "generic",
    featured: true,
    activeCollectionPlacements: 2,
    discoveryPosition: 1,
    coverageGap: 3,
    attemptCount: 0,
  });
  const retry = buildRecipeImagePriority({
    artworkState: "generic",
    featured: true,
    activeCollectionPlacements: 2,
    discoveryPosition: 1,
    coverageGap: 3,
    attemptCount: 2,
  });

  assertEquals(first.total, Object.values(first.breakdown).reduce((sum, value) => sum + value, 0));
  assertEquals(first.breakdown.artwork, 100);
  assertEquals(first.breakdown.retry, 0);
  assertEquals(retry.breakdown.retry, -30);
  assertEquals(first.total - retry.total, 30);
});

Deno.test("job lifecycle permits review and replacement without auto-publishing", () => {
  assert(canTransitionRecipeImageJob("generated", "qa_checking"), "generated image cannot enter QA");
  assert(canTransitionRecipeImageJob("qa_checking", "editorial_review"), "QA cannot nominate for review");
  assert(canTransitionRecipeImageJob("queued", "generating"));
  assert(canTransitionRecipeImageJob("generating", "generated"));
  assert(canTransitionRecipeImageJob("generated", "editorial_review"));
  assert(canTransitionRecipeImageJob("editorial_review", "approved"));
  assert(canTransitionRecipeImageJob("approved", "published"));
  assert(!canTransitionRecipeImageJob("generated", "published"));
  assert(!canTransitionRecipeImageJob("rejected", "published"));
});

Deno.test("generated image parser requires one bounded base64 payload", () => {
  const parsed = parseGeneratedImage({
    data: [{ b64_json: "aGVsbG8=" }],
    usage: { input_tokens: 12, output_tokens: 34, total_tokens: 46 },
  });

  assertEquals(new TextDecoder().decode(parsed.bytes), "hello");
  assertEquals(parsed.usage, { inputTokens: 12, outputTokens: 34, totalTokens: 46 });
  assertThrows(() => parseGeneratedImage({ data: [] }), Error, "missing_image_output");
  assertThrows(() => parseGeneratedImage({ data: [{ b64_json: "not base64" }] }), Error, "invalid_image_output");
});

Deno.test("storage paths are immutable and content addressed", async () => {
  const path = await buildRecipeImageStoragePath({
    rosterId: source.rosterId,
    recipeContentHash: source.contentHash,
    promptVersion: RECIPE_IMAGE_PROMPT_VERSION,
    model: RECIPE_IMAGE_MODEL,
    candidateIndex: 2,
    bytes: new TextEncoder().encode("image"),
  });

  assert(path.startsWith("catalog/br012/"));
  assert(path.endsWith("/candidate-2.webp"));
  assertStringIncludes(path, "kwilt-recipe-hero-v1");
});
