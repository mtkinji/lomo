import {
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  buildRecipeEditorialEnrichmentRequest,
  parseRecipeEditorialEnrichmentResponse,
  type RecipeEditorialSource,
} from "../recipeEditorialEnrichment.ts";

const source: RecipeEditorialSource = {
  rosterId: "BR012",
  sourceRecipeHash: `sha256:${"a".repeat(64)}`,
  title: "Red salsa tortilla-and-egg skillet (Chilaquiles rojos)",
  description: "Fried tortilla pieces folded through red chile salsa and topped with eggs.",
  category: "Breakfast & brunch",
  cuisine: "Mexican",
  ingredients: ["12 corn tortillas", "2 cups red chile salsa", "4 eggs"],
  instructions: [
    "Fry the tortilla wedges in a wide skillet until crisp.",
    "Warm the salsa, fold in the chips briefly, and top with fried eggs.",
  ],
};

const draft = {
  rosterId: source.rosterId,
  sourceRecipeHash: source.sourceRecipeHash,
  equipmentNeeds: [{ id: "wide-skillet", label: "Wide skillet", reviewCategoryId: null }],
  equipmentAnnotations: [{
    instructionIndex: 0,
    phrase: "wide skillet",
    needId: "wide-skillet",
    focus: "general",
    accessibleLabel: "A wide skillet helps the tortilla wedges crisp evenly.",
    displayText: "Use a wide skillet for even crisping.",
  }],
  origin: {
    label: "Central Mexico",
    region: "North America",
    markers: [{ label: "Mexico City, Mexico", latitude: 19.4326, longitude: -99.1332 }],
    map: { center: { longitude: -99.1332, latitude: 19.4326 }, scale: 1100, highlightedCountryIds: ["484"] },
  },
  history: {
    paragraphs: [
      "Chilaquiles are widely associated with Mexican cooking and turn cooked tortillas into a sauced breakfast or midday dish.",
      "Published descriptions show many regional and household variations, so this recipe should be presented as one form rather than the definitive original.",
    ],
    sources: [
      { title: "Chilaquiles", publisher: "Encyclopaedia Britannica", url: "https://www.britannica.com/topic/chilaquiles" },
      { title: "Chilaquiles history", publisher: "Smithsonian Magazine", url: "https://www.smithsonianmag.com/example/chilaquiles" },
    ],
  },
};

function response(output: unknown, citedUrls: string | string[] = draft.history.sources.map(({ url }) => url)) {
  const text = JSON.stringify(output);
  const urls = Array.isArray(citedUrls) ? citedUrls : [citedUrls];
  return {
    id: "resp_recipe_123",
    output: [{
      type: "message",
      content: [{
        type: "output_text",
        text,
        annotations: urls.map((url) => ({ type: "url_citation", url, title: "Chilaquiles", start_index: 0, end_index: 10 })),
      }],
    }],
    usage: { input_tokens: 1200, output_tokens: 700, total_tokens: 1900 },
  };
}

Deno.test("editorial request uses bounded web research, strict structured output, and no storage", () => {
  const request = buildRecipeEditorialEnrichmentRequest(source, "gpt-5.6-luna");

  assertEquals(request.model, "gpt-5.6-luna");
  assertEquals(request.store, false);
  assertEquals(request.tools, [{ type: "web_search", search_context_size: "medium" }]);
  assertEquals(request.max_tool_calls, 3);
  assertEquals(request.include, ["web_search_call.action.sources"]);
  assertEquals(request.text.format.type, "json_schema");
  assertEquals(request.text.format.strict, true);
  assertEquals(request.text.format.schema.additionalProperties, false);
  assertEquals(request.text.format.schema.properties.origin.properties.map.properties.center, {
    type: "object",
    additionalProperties: false,
    required: ["longitude", "latitude"],
    properties: {
      longitude: { type: "number", minimum: -180, maximum: 180 },
      latitude: { type: "number", minimum: -90, maximum: 90 },
    },
  });
  assertEquals(request.max_output_tokens, 5000);
  assertStringIncludes(request.input, source.title);
  assertStringIncludes(request.input, source.sourceRecipeHash);
  assertStringIncludes(request.input, "Do not infer equipment that the instructions do not support");
  assertStringIncludes(request.input, "three-digit ISO 3166-1 numeric country IDs");
  assertStringIncludes(request.input, "Do not put URLs or Markdown citations in the history paragraphs");
});

Deno.test("response parser rejects site-incompatible maps and weak history formatting", () => {
  assertThrows(
    () => parseRecipeEditorialEnrichmentResponse(response({
      ...draft,
      origin: { ...draft.origin, map: { ...draft.origin.map, scale: 9 } },
    }), source),
    Error,
    "invalid_origin_map_scale",
  );
  assertThrows(
    () => parseRecipeEditorialEnrichmentResponse(response({
      ...draft,
      origin: { ...draft.origin, map: { ...draft.origin.map, highlightedCountryIds: ["MX"] } },
    }), source),
    Error,
    "invalid_highlighted_country_id",
  );
  assertThrows(
    () => parseRecipeEditorialEnrichmentResponse(response({
      ...draft,
      history: { ...draft.history, paragraphs: [`Background ([source](${draft.history.sources[0].url}))`, draft.history.paragraphs[1]] },
    }), source),
    Error,
    "history_paragraph_contains_link",
  );
});

Deno.test("response parser accepts history URLs present in the consulted web source list", () => {
  const result = response(draft, "https://example.com/other");
  result.output.unshift({
    type: "web_search_call",
    action: {
      type: "search",
      sources: draft.history.sources.map(({ title, url }) => ({
        type: "url",
        title,
        url: `${url}?utm_source=chatgpt.com`,
      })),
    },
  } as never);

  const parsed = parseRecipeEditorialEnrichmentResponse(result, source);
  assertEquals(parsed.draft.history.sources[0].url, draft.history.sources[0].url);
  assertEquals(parsed.citations.some(({ url }) => url === draft.history.sources[0].url), true);
});

Deno.test("response parser accepts grounded equipment and web-cited history", () => {
  const parsed = parseRecipeEditorialEnrichmentResponse(response(draft), source);

  assertEquals(parsed.draft.rosterId, "BR012");
  assertEquals(parsed.draft.origin.region, "North America");
  assertEquals(parsed.draft.origin.map.center, [-99.1332, 19.4326]);
  assertEquals(parsed.citations, draft.history.sources.map(({ url }) => ({ title: "Chilaquiles", url })));
  assertEquals(parsed.responseId, "resp_recipe_123");
  assertEquals(parsed.usage, { inputTokens: 1200, outputTokens: 700, totalTokens: 1900 });
});

Deno.test("response parser rejects uncited history, stale recipes, and ungrounded annotations", () => {
  assertThrows(
    () => parseRecipeEditorialEnrichmentResponse(response(draft, "https://example.com/other"), source),
    Error,
    "history_source_not_cited",
  );
  assertThrows(
    () => parseRecipeEditorialEnrichmentResponse(response({ ...draft, sourceRecipeHash: `sha256:${"b".repeat(64)}` }), source),
    Error,
    "source_recipe_hash_mismatch",
  );
  assertThrows(
    () => parseRecipeEditorialEnrichmentResponse(response({
      ...draft,
      equipmentAnnotations: [{ ...draft.equipmentAnnotations[0], phrase: "cast-iron pan" }],
    }), source),
    Error,
    "annotation_phrase_not_grounded",
  );
});

Deno.test("response parser rejects invalid geography and unknown fields", () => {
  assertThrows(
    () => parseRecipeEditorialEnrichmentResponse(response({
      ...draft,
      origin: { ...draft.origin, markers: [{ ...draft.origin.markers[0], latitude: 120 }] },
    }), source),
    Error,
    "invalid_marker_latitude",
  );
  assertThrows(
    () => parseRecipeEditorialEnrichmentResponse(response({ ...draft, confidence: "high" }), source),
    Error,
    "unknown_draft_field",
  );
});
