export const RECIPE_EDITORIAL_PROMPT_VERSION = "kwilt-recipe-editorial-v2";
export const DEFAULT_RECIPE_EDITORIAL_MODEL = "gpt-5.6-luna";

export type RecipeEditorialSource = {
  rosterId: string;
  sourceRecipeHash: string;
  title: string;
  description: string | null;
  category: string;
  cuisine: string;
  ingredients: string[];
  instructions: string[];
};

export type RecipeEditorialDraft = {
  rosterId: string;
  sourceRecipeHash: string;
  equipmentNeeds: Array<{ id: string; label: string; reviewCategoryId: string | null }>;
  equipmentAnnotations: Array<{
    instructionIndex: number;
    phrase: string;
    needId: string;
    focus: "specialty" | "substitute" | "general";
    accessibleLabel: string | null;
    displayText: string | null;
  }>;
  origin: {
    label: string;
    region: string;
    markers: Array<{ label: string; latitude: number; longitude: number }>;
    map: { center: [number, number]; scale: number; highlightedCountryIds: string[] };
  };
  history: {
    paragraphs: string[];
    sources: Array<{ title: string; publisher: string; url: string }>;
  };
};

type JsonRecord = Record<string, unknown>;

const nullableString = (maxLength: number) => ({ type: ["string", "null"], maxLength });
const string = (maxLength: number, minLength = 1) => ({ type: "string", minLength, maxLength });

export const RECIPE_EDITORIAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["rosterId", "sourceRecipeHash", "equipmentNeeds", "equipmentAnnotations", "origin", "history"],
  properties: {
    rosterId: { type: "string", pattern: "^[A-Z]{2}[0-9]{3}$" },
    sourceRecipeHash: { type: "string", pattern: "^sha256:[a-f0-9]{64}$" },
    equipmentNeeds: {
      type: "array",
      maxItems: 24,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "reviewCategoryId"],
        properties: {
          id: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", maxLength: 80 },
          label: string(160),
          reviewCategoryId: nullableString(80),
        },
      },
    },
    equipmentAnnotations: {
      type: "array",
      maxItems: 24,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["instructionIndex", "phrase", "needId", "focus", "accessibleLabel", "displayText"],
        properties: {
          instructionIndex: { type: "integer", minimum: 0, maximum: 199 },
          phrase: string(500),
          needId: string(80),
          focus: { type: "string", enum: ["specialty", "substitute", "general"] },
          accessibleLabel: nullableString(240),
          displayText: nullableString(500),
        },
      },
    },
    origin: {
      type: "object",
      additionalProperties: false,
      required: ["label", "region", "markers", "map"],
      properties: {
        label: string(160),
        region: string(240),
        markers: {
          type: "array",
          minItems: 1,
          maxItems: 8,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "latitude", "longitude"],
            properties: {
              label: string(120),
              latitude: { type: "number", minimum: -90, maximum: 90 },
              longitude: { type: "number", minimum: -180, maximum: 180 },
            },
          },
        },
        map: {
          type: "object",
          additionalProperties: false,
          required: ["center", "scale", "highlightedCountryIds"],
          properties: {
            center: {
              type: "object",
              additionalProperties: false,
              required: ["longitude", "latitude"],
              properties: {
                longitude: { type: "number", minimum: -180, maximum: 180 },
                latitude: { type: "number", minimum: -90, maximum: 90 },
              },
            },
            scale: { type: "number", minimum: 500, maximum: 1500 },
            highlightedCountryIds: { type: "array", maxItems: 24, items: { type: "string", pattern: "^[0-9]{3}$" } },
          },
        },
      },
    },
    history: {
      type: "object",
      additionalProperties: false,
      required: ["paragraphs", "sources"],
      properties: {
        paragraphs: { type: "array", minItems: 2, maxItems: 4, items: string(2000, 40) },
        sources: {
          type: "array",
          minItems: 2,
          maxItems: 6,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "publisher", "url"],
            properties: { title: string(300), publisher: string(200), url: string(2000) },
          },
        },
      },
    },
  },
} as const;

export function buildRecipeEditorialEnrichmentRequest(source: RecipeEditorialSource, model = DEFAULT_RECIPE_EDITORIAL_MODEL) {
  const sourceJson = JSON.stringify(source, null, 2);
  return {
    model,
    store: false,
    tools: [{ type: "web_search" as const, search_context_size: "medium" as const }],
    include: ["web_search_call.action.sources" as const],
    max_tool_calls: 3,
    max_output_tokens: 5000,
    reasoning: { effort: "low" as const },
    text: {
      format: {
        type: "json_schema" as const,
        name: "kwilt_recipe_editorial_enrichment",
        strict: true,
        schema: RECIPE_EDITORIAL_SCHEMA,
      },
    },
    input: [
      `Prompt contract: ${RECIPE_EDITORIAL_PROMPT_VERSION}`,
      "Research and draft factual editorial enrichment for this exact recipe. Use web search for its geographic origin and history.",
      "Return the rosterId and sourceRecipeHash exactly. Distinguish documented facts from uncertain or disputed claims. Avoid claims of a single inventor or definitive birthplace unless strong sources agree.",
      "Write two to four concise plain-text history paragraphs for a family cookbook. Do not put URLs or Markdown citations in the history paragraphs; put sources only in history.sources.",
      "Return two to six independent HTTPS sources actually consulted through web search. Prefer museums, universities, archives, books, major editorial publications, and primary historical records. Do not return Wikipedia, Reddit, social media, or content farms as history sources.",
      "Identify equipment only when the recipe instructions support it. Do not infer equipment that the instructions do not support. Each annotation phrase must be copied exactly from one instruction and occur there exactly once.",
      "Use three-digit ISO 3166-1 numeric country IDs, including leading zeroes. Coordinates are editorial map anchors, not claims of an exact birthplace. Markers must name geographic places, not restaurants or businesses.",
      "Kwilt map scale is an editorial framing value from 500 for a broad region to 1500 for a focused locality; do not use ordinary web-map zoom levels.",
      `Recipe source:\n${sourceJson}`,
    ].join("\n\n"),
  };
}

function object(value: unknown, error: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(error);
  return value as JsonRecord;
}

function exactKeys(value: JsonRecord, keys: readonly string[], error: string): void {
  if (Object.keys(value).some((key) => !keys.includes(key)) || keys.some((key) => !(key in value))) throw new Error(error);
}

function requiredString(value: unknown, error: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) throw new Error(error);
  return value.trim();
}

function nullableText(value: unknown, error: string, maxLength: number): string | null {
  return value === null ? null : requiredString(value, error, maxLength);
}

function finite(value: unknown, error: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error(error);
  return value;
}

function array(value: unknown, error: string, min: number, max: number): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new Error(error);
  return value;
}

export function parseRecipeEditorialSource(value: unknown): RecipeEditorialSource {
  const source = object(value, "invalid_recipe_source");
  exactKeys(source, ["rosterId", "sourceRecipeHash", "title", "description", "category", "cuisine", "ingredients", "instructions"], "invalid_recipe_source_fields");
  const rosterId = requiredString(source.rosterId, "invalid_roster_id", 5).toUpperCase();
  if (!/^[A-Z]{2}[0-9]{3}$/.test(rosterId)) throw new Error("invalid_roster_id");
  const sourceRecipeHash = requiredString(source.sourceRecipeHash, "invalid_source_recipe_hash", 71);
  if (!/^sha256:[a-f0-9]{64}$/.test(sourceRecipeHash)) throw new Error("invalid_source_recipe_hash");
  const ingredients = array(source.ingredients, "invalid_recipe_ingredients", 1, 200)
    .map((line) => requiredString(line, "invalid_recipe_ingredient", 1000));
  const instructions = array(source.instructions, "invalid_recipe_instructions", 1, 200)
    .map((step) => requiredString(step, "invalid_recipe_instruction", 8000));
  return {
    rosterId,
    sourceRecipeHash,
    title: requiredString(source.title, "invalid_recipe_title", 160),
    description: nullableText(source.description, "invalid_recipe_description", 4000),
    category: requiredString(source.category, "invalid_recipe_category", 120),
    cuisine: requiredString(source.cuisine, "invalid_recipe_cuisine", 160),
    ingredients,
    instructions,
  };
}

function outputText(response: JsonRecord): string {
  for (const output of Array.isArray(response.output) ? response.output : []) {
    const item = object(output, "invalid_response_output");
    for (const content of Array.isArray(item.content) ? item.content : []) {
      const part = object(content, "invalid_response_content");
      if (part.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  throw new Error("missing_response_output_text");
}

function citedUrls(response: JsonRecord): Array<{ title: string; url: string }> {
  const citations = new Map<string, string>();
  const add = (urlValue: unknown, titleValue: unknown) => {
    if (typeof urlValue !== "string" || !/^https:\/\//.test(urlValue)) return;
    const url = normalizedSourceUrl(urlValue);
    const title = typeof titleValue === "string" && titleValue.trim() ? titleValue.trim() : url;
    citations.set(url, title);
  };
  for (const output of Array.isArray(response.output) ? response.output : []) {
    const item = object(output, "invalid_response_output");
    const action = item.action && typeof item.action === "object" && !Array.isArray(item.action) ? item.action as JsonRecord : {};
    for (const source of Array.isArray(action.sources) ? action.sources : []) {
      const row = object(source, "invalid_web_search_source");
      add(row.url, row.title);
    }
    for (const content of Array.isArray(item.content) ? item.content : []) {
      const part = object(content, "invalid_response_content");
      for (const annotation of Array.isArray(part.annotations) ? part.annotations : []) {
        const row = object(annotation, "invalid_response_annotation");
        if (row.type === "url_citation") add(row.url, row.title);
      }
    }
  }
  return [...citations].map(([url, title]) => ({ title, url }));
}

function normalizedSourceUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    url.searchParams.delete("utm_source");
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return value;
  }
}

function parseDraft(value: unknown, source: RecipeEditorialSource): RecipeEditorialDraft {
  const draft = object(value, "invalid_draft");
  exactKeys(draft, ["rosterId", "sourceRecipeHash", "equipmentNeeds", "equipmentAnnotations", "origin", "history"], "unknown_draft_field");
  const rosterId = requiredString(draft.rosterId, "invalid_roster_id", 5);
  if (rosterId !== source.rosterId) throw new Error("roster_id_mismatch");
  const sourceRecipeHash = requiredString(draft.sourceRecipeHash, "invalid_source_recipe_hash", 71);
  if (sourceRecipeHash !== source.sourceRecipeHash) throw new Error("source_recipe_hash_mismatch");

  const equipmentNeeds = array(draft.equipmentNeeds, "invalid_equipment_needs", 0, 24).map((value) => {
    const need = object(value, "invalid_equipment_need");
    exactKeys(need, ["id", "label", "reviewCategoryId"], "invalid_equipment_need_fields");
    const id = requiredString(need.id, "invalid_equipment_need_id", 80);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error("invalid_equipment_need_id");
    return { id, label: requiredString(need.label, "invalid_equipment_need_label", 160), reviewCategoryId: nullableText(need.reviewCategoryId, "invalid_review_category_id", 80) };
  });
  const needIds = new Set(equipmentNeeds.map(({ id }) => id));
  if (needIds.size !== equipmentNeeds.length) throw new Error("duplicate_equipment_need_id");

  const equipmentAnnotations = array(draft.equipmentAnnotations, "invalid_equipment_annotations", 0, 24).map((value) => {
    const annotation = object(value, "invalid_equipment_annotation");
    exactKeys(annotation, ["instructionIndex", "phrase", "needId", "focus", "accessibleLabel", "displayText"], "invalid_equipment_annotation_fields");
    if (!Number.isInteger(annotation.instructionIndex) || Number(annotation.instructionIndex) < 0 || Number(annotation.instructionIndex) >= source.instructions.length) {
      throw new Error("invalid_annotation_instruction_index");
    }
    const instructionIndex = Number(annotation.instructionIndex);
    const phrase = requiredString(annotation.phrase, "invalid_annotation_phrase", 500);
    const instruction = source.instructions[instructionIndex];
    if (instruction.split(phrase).length - 1 !== 1) {
      const diagnostic = `${instructionIndex}:${phrase}:${instruction}`
        .replace(/[^a-zA-Z0-9 .,_:;()'’“”\/-]/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 200);
      throw new Error(`annotation_phrase_not_grounded:${diagnostic}`);
    }
    const needId = requiredString(annotation.needId, "invalid_annotation_need_id", 80);
    if (!needIds.has(needId)) throw new Error("annotation_need_not_found");
    if (annotation.focus !== "specialty" && annotation.focus !== "substitute" && annotation.focus !== "general") throw new Error("invalid_annotation_focus");
    const focus = annotation.focus as "specialty" | "substitute" | "general";
    return {
      instructionIndex,
      phrase,
      needId,
      focus,
      accessibleLabel: nullableText(annotation.accessibleLabel, "invalid_annotation_accessible_label", 240),
      displayText: nullableText(annotation.displayText, "invalid_annotation_display_text", 500),
    };
  });

  const origin = object(draft.origin, "invalid_origin");
  exactKeys(origin, ["label", "region", "markers", "map"], "invalid_origin_fields");
  const markers = array(origin.markers, "invalid_origin_markers", 1, 8).map((value) => {
    const marker = object(value, "invalid_origin_marker");
    exactKeys(marker, ["label", "latitude", "longitude"], "invalid_origin_marker_fields");
    return {
      label: requiredString(marker.label, "invalid_marker_label", 120),
      latitude: finite(marker.latitude, "invalid_marker_latitude", -90, 90),
      longitude: finite(marker.longitude, "invalid_marker_longitude", -180, 180),
    };
  });
  const map = object(origin.map, "invalid_origin_map");
  exactKeys(map, ["center", "scale", "highlightedCountryIds"], "invalid_origin_map_fields");
  const center = object(map.center, "invalid_origin_map_center");
  exactKeys(center, ["longitude", "latitude"], "invalid_origin_map_center_fields");
  const highlightedCountryIds = array(map.highlightedCountryIds, "invalid_highlighted_country_ids", 0, 24).map((value) => {
    const id = requiredString(value, "invalid_highlighted_country_id", 12);
    if (!/^[0-9]{3}$/.test(id)) throw new Error("invalid_highlighted_country_id");
    return id;
  });

  const history = object(draft.history, "invalid_history");
  exactKeys(history, ["paragraphs", "sources"], "invalid_history_fields");
  const paragraphs = array(history.paragraphs, "invalid_history_paragraphs", 2, 4).map((value) => {
    const paragraph = requiredString(value, "invalid_history_paragraph", 2000);
    if (/https?:\/\/|\[[^\]]+\]\([^)]*\)/i.test(paragraph)) throw new Error("history_paragraph_contains_link");
    return paragraph;
  });
  const sources = array(history.sources, "invalid_history_sources", 2, 6).map((value) => {
    const citation = object(value, "invalid_history_source");
    exactKeys(citation, ["title", "publisher", "url"], "invalid_history_source_fields");
    const url = requiredString(citation.url, "invalid_history_source_url", 2000);
    if (!/^https:\/\//.test(url)) throw new Error("invalid_history_source_url");
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    if (hostname === "wikipedia.org" || hostname.endsWith(".wikipedia.org") || hostname === "reddit.com" || hostname.endsWith(".reddit.com")) {
      throw new Error("weak_history_source_domain");
    }
    return { title: requiredString(citation.title, "invalid_history_source_title", 300), publisher: requiredString(citation.publisher, "invalid_history_source_publisher", 200), url };
  });
  if (new Set(sources.map(({ url }) => url)).size !== sources.length) throw new Error("duplicate_history_source_url");

  return {
    rosterId,
    sourceRecipeHash,
    equipmentNeeds,
    equipmentAnnotations,
    origin: {
      label: requiredString(origin.label, "invalid_origin_label", 160),
      region: requiredString(origin.region, "invalid_origin_region", 240),
      markers,
      map: {
        center: [finite(center.longitude, "invalid_origin_center_longitude", -180, 180), finite(center.latitude, "invalid_origin_center_latitude", -90, 90)],
        scale: finite(map.scale, "invalid_origin_map_scale", 500, 1500),
        highlightedCountryIds,
      },
    },
    history: { paragraphs, sources },
  };
}

function tokenCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function parseRecipeEditorialEnrichmentResponse(value: unknown, source: RecipeEditorialSource) {
  const response = object(value, "invalid_response");
  let decoded: unknown;
  try {
    decoded = JSON.parse(outputText(response));
  } catch (error) {
    if (error instanceof Error && error.message === "missing_response_output_text") throw error;
    throw new Error("invalid_response_json");
  }
  const draft = parseDraft(decoded, source);
  const citations = citedUrls(response);
  const cited = new Set(citations.map(({ url }) => normalizedSourceUrl(url)));
  if (draft.history.sources.some(({ url }) => !cited.has(normalizedSourceUrl(url)))) throw new Error("history_source_not_cited");
  const usage = response.usage && typeof response.usage === "object" && !Array.isArray(response.usage) ? response.usage as JsonRecord : {};
  return {
    draft,
    citations,
    responseId: requiredString(response.id, "invalid_response_id", 200),
    usage: {
      inputTokens: tokenCount(usage.input_tokens),
      outputTokens: tokenCount(usage.output_tokens),
      totalTokens: tokenCount(usage.total_tokens),
    },
  };
}
