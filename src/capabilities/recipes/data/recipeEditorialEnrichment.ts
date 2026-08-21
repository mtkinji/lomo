export type RecipeEquipmentNeed = {
  id: string;
  label: string;
  reviewCategoryId?: string;
};

export type RecipeEquipmentAnnotation = {
  instructionIndex: number;
  phrase: string;
  needId: string;
  focus: 'specialty' | 'substitute' | 'general';
  accessibleLabel?: string;
  displayText?: string;
};

export type RecipeOrigin = {
  label: string;
  region: string;
  markers: Array<{ label: string; latitude: number; longitude: number }>;
  map: {
    center: [longitude: number, latitude: number];
    scale: number;
    highlightedCountryIds: string[];
  };
};

export type RecipeHistorySource = { title: string; publisher: string; url: string };
export type RecipeHeroImageState = {
  state: 'missing' | 'queued' | 'editorial_review' | 'approved' | 'published';
  storageRef: string | null;
  altText: string | null;
  width: number | null;
  height: number | null;
};

export type RecipeEditorialCostTier = '$' | '$$' | '$$$';
export type RecipeEditorialDifficulty = 'Easy' | 'Moderate' | 'Advanced';
export type RecipeEditorialReviewState = 'pending' | 'reviewed';

export type RecipeStructuredIngredient = {
  position: number;
  originalText: string;
  quantityMin: number | null;
  quantityMax: number | null;
  unit: string | null;
  ingredientConcept: string | null;
  preparation: string | null;
  optional: boolean;
  parseConfidence: number;
};

export type RecipeEditorialEnrichment = {
  schemaVersion: 2;
  rosterId: string;
  sourceRecipeHash: string;
  review: {
    state: 'in_progress' | 'reviewed';
    reviewedAt: string;
    reviewedBy: string;
    sections: {
      cookingTruth: RecipeEditorialReviewState;
      structuredIngredients: RecipeEditorialReviewState;
      originHistory: RecipeEditorialReviewState;
      equipment: RecipeEditorialReviewState;
      commerce: RecipeEditorialReviewState;
      sitePublication: 'pending' | 'ready' | 'published';
    };
  };
  costTier: RecipeEditorialCostTier | null;
  difficulty: RecipeEditorialDifficulty | null;
  structuredIngredients: RecipeStructuredIngredient[];
  instructionQuantityPhrases: Record<number, string[]>;
  commerce: {
    decision: 'pending' | 'no_purchase_needed' | 'review_category';
    needId: string | null;
    reviewCategoryId: string | null;
    rationale: string | null;
    noPurchaseAlternative: string | null;
  };
  publication: { slug: string | null; publishedAt: string | null };
  equipmentNeeds: RecipeEquipmentNeed[];
  equipmentAnnotations: RecipeEquipmentAnnotation[];
  origin: RecipeOrigin;
  history: { paragraphs: string[]; sources: RecipeHistorySource[] };
  heroImage: RecipeHeroImageState;
};

type UnknownRecord = Record<string, unknown>;

function record(value: unknown, path: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path} must be an object.`);
  return value as UnknownRecord;
}

function exactKeys(value: UnknownRecord, allowed: readonly string[], path: string): void {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(value).find((key) => !allowedSet.has(key));
  if (unknown) throw new Error(`${path}.${unknown} is not supported.`);
  const missing = allowed.find((key) => !(key in value));
  if (missing) throw new Error(`${path}.${missing} is required.`);
}

function text(value: unknown, path: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${path} is invalid.`);
  return value.trim();
}

function optionalText(value: unknown, path: string, max: number): string | undefined {
  return value === undefined ? undefined : text(value, path, max);
}

function finite(value: unknown, path: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${path} is invalid.`);
  return value;
}

function integer(value: unknown, path: string, min: number, max: number): number {
  const parsed = finite(value, path, min, max);
  if (!Number.isInteger(parsed)) throw new Error(`${path} must be an integer.`);
  return parsed;
}

function nullableInteger(value: unknown, path: string): number | null {
  return value === null ? null : integer(value, path, 1, 10_000);
}

function nullableText(value: unknown, path: string, max: number): string | null {
  return value === null ? null : text(value, path, max);
}

function parseReviewState(value: unknown, path: string): RecipeEditorialReviewState {
  if (value !== 'pending' && value !== 'reviewed') throw new Error(`${path} is invalid.`);
  return value;
}

function parseStructuredIngredients(
  value: unknown,
  canonicalIngredients: readonly string[],
  reviewed: boolean,
): RecipeStructuredIngredient[] {
  if (!Array.isArray(value) || value.length > 80) throw new Error('structuredIngredients is invalid.');
  const parsed = value.map((entry, index) => {
    const path = `structuredIngredients[${index}]`;
    const row = record(entry, path);
    exactKeys(row, ['position', 'originalText', 'quantityMin', 'quantityMax', 'unit', 'ingredientConcept', 'preparation', 'optional', 'parseConfidence'], path);
    const position = integer(row.position, `${path}.position`, 0, 79);
    if (position !== index) throw new Error(`${path}.position must match its array position.`);
    const originalText = text(row.originalText, `${path}.originalText`, 1_000);
    if (canonicalIngredients.length && originalText !== canonicalIngredients[index]) {
      throw new Error(`${path}.originalText must match the canonical ingredient.`);
    }
    const quantityMin = row.quantityMin === null ? null : finite(row.quantityMin, `${path}.quantityMin`, 0, 100_000);
    const quantityMax = row.quantityMax === null ? null : finite(row.quantityMax, `${path}.quantityMax`, 0, 100_000);
    if (quantityMin !== null && quantityMax !== null && quantityMax < quantityMin) {
      throw new Error(`${path}.quantityMax cannot be less than quantityMin.`);
    }
    if (typeof row.optional !== 'boolean') throw new Error(`${path}.optional is invalid.`);
    return {
      position,
      originalText,
      quantityMin,
      quantityMax,
      unit: nullableText(row.unit, `${path}.unit`, 120),
      ingredientConcept: nullableText(row.ingredientConcept, `${path}.ingredientConcept`, 240),
      preparation: nullableText(row.preparation, `${path}.preparation`, 500),
      optional: row.optional,
      parseConfidence: finite(row.parseConfidence, `${path}.parseConfidence`, 0, 1),
    };
  });
  if (reviewed && parsed.length !== canonicalIngredients.length) {
    throw new Error('Reviewed structuredIngredients must cover every canonical ingredient.');
  }
  return parsed;
}

function parseInstructionQuantityPhrases(value: unknown, instructions: readonly string[]): Record<number, string[]> {
  const row = record(value, 'instructionQuantityPhrases');
  const parsed: Record<number, string[]> = {};
  for (const [rawIndex, phrases] of Object.entries(row)) {
    if (!/^\d+$/.test(rawIndex)) throw new Error(`instructionQuantityPhrases.${rawIndex} is invalid.`);
    const index = Number(rawIndex);
    if (!instructions[index] || !Array.isArray(phrases) || phrases.length > 24) {
      throw new Error(`instructionQuantityPhrases.${rawIndex} is invalid.`);
    }
    parsed[index] = phrases.map((phrase, phraseIndex) => {
      const parsedPhrase = text(phrase, `instructionQuantityPhrases.${rawIndex}[${phraseIndex}]`, 120);
      if (phraseOccurrences(instructions[index], parsedPhrase) !== 1) {
        throw new Error(`instructionQuantityPhrases.${rawIndex}[${phraseIndex}] must appear exactly once in its instruction.`);
      }
      return parsedPhrase;
    });
  }
  return parsed;
}

function parseCommerce(value: unknown, reviewed: boolean): RecipeEditorialEnrichment['commerce'] {
  const row = record(value, 'commerce');
  exactKeys(row, ['decision', 'needId', 'reviewCategoryId', 'rationale', 'noPurchaseAlternative'], 'commerce');
  if (row.decision !== 'pending' && row.decision !== 'no_purchase_needed' && row.decision !== 'review_category') {
    throw new Error('commerce.decision is invalid.');
  }
  if (reviewed && row.decision === 'pending') throw new Error('Reviewed commerce requires a decision.');
  const parsed = {
    decision: row.decision,
    needId: nullableText(row.needId, 'commerce.needId', 80),
    reviewCategoryId: nullableText(row.reviewCategoryId, 'commerce.reviewCategoryId', 80),
    rationale: nullableText(row.rationale, 'commerce.rationale', 1_000),
    noPurchaseAlternative: nullableText(row.noPurchaseAlternative, 'commerce.noPurchaseAlternative', 500),
  } as RecipeEditorialEnrichment['commerce'];
  if (parsed.decision === 'review_category' && (!parsed.needId || !parsed.reviewCategoryId || !parsed.rationale || !parsed.noPurchaseAlternative)) {
    throw new Error('A commerce review category requires a need, category, rationale, and no-purchase alternative.');
  }
  if (parsed.decision === 'no_purchase_needed' && !parsed.rationale) throw new Error('A no-purchase decision requires a rationale.');
  return parsed;
}

function parsePublication(value: unknown): RecipeEditorialEnrichment['publication'] {
  const row = record(value, 'publication');
  exactKeys(row, ['slug', 'publishedAt'], 'publication');
  const slug = nullableText(row.slug, 'publication.slug', 180);
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('publication.slug is invalid.');
  const publishedAt = nullableText(row.publishedAt, 'publication.publishedAt', 40);
  if (publishedAt && !Number.isFinite(Date.parse(publishedAt))) throw new Error('publication.publishedAt is invalid.');
  return { slug, publishedAt };
}

function parseNeed(value: unknown, index: number): RecipeEquipmentNeed {
  const path = `equipmentNeeds[${index}]`;
  const row = record(value, path);
  const allowed = ['id', 'label', ...(row.reviewCategoryId === undefined ? [] : ['reviewCategoryId'])];
  exactKeys(row, allowed, path);
  const id = text(row.id, `${path}.id`, 80);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(`${path}.id is invalid.`);
  const reviewCategoryId = optionalText(row.reviewCategoryId, `${path}.reviewCategoryId`, 80);
  if (reviewCategoryId && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(reviewCategoryId)) {
    throw new Error(`${path}.reviewCategoryId is invalid.`);
  }
  return { id, label: text(row.label, `${path}.label`, 160), ...(reviewCategoryId ? { reviewCategoryId } : {}) };
}

function parseAnnotation(value: unknown, index: number): RecipeEquipmentAnnotation {
  const path = `equipmentAnnotations[${index}]`;
  const row = record(value, path);
  const optionalKeys = ['accessibleLabel', 'displayText'].filter((key) => row[key] !== undefined);
  exactKeys(row, ['instructionIndex', 'phrase', 'needId', 'focus', ...optionalKeys], path);
  if (row.focus !== 'specialty' && row.focus !== 'substitute' && row.focus !== 'general') {
    throw new Error(`${path}.focus is invalid.`);
  }
  const accessibleLabel = optionalText(row.accessibleLabel, `${path}.accessibleLabel`, 240);
  const displayText = optionalText(row.displayText, `${path}.displayText`, 500);
  return {
    instructionIndex: integer(row.instructionIndex, `${path}.instructionIndex`, 0, 199),
    phrase: text(row.phrase, `${path}.phrase`, 500),
    needId: text(row.needId, `${path}.needId`, 80),
    focus: row.focus,
    ...(accessibleLabel ? { accessibleLabel } : {}),
    ...(displayText ? { displayText } : {}),
  };
}

function parseOrigin(value: unknown): RecipeOrigin {
  const origin = record(value, 'origin');
  exactKeys(origin, ['label', 'region', 'markers', 'map'], 'origin');
  if (!Array.isArray(origin.markers) || !origin.markers.length || origin.markers.length > 8) {
    throw new Error('origin.markers must contain one to eight markers.');
  }
  const markers = origin.markers.map((value, index) => {
    const path = `origin.markers[${index}]`;
    const marker = record(value, path);
    exactKeys(marker, ['label', 'latitude', 'longitude'], path);
    return {
      label: text(marker.label, `${path}.label`, 120),
      latitude: finite(marker.latitude, `${path}.latitude`, -90, 90),
      longitude: finite(marker.longitude, `${path}.longitude`, -180, 180),
    };
  });
  const map = record(origin.map, 'origin.map');
  exactKeys(map, ['center', 'scale', 'highlightedCountryIds'], 'origin.map');
  if (!Array.isArray(map.center) || map.center.length !== 2) throw new Error('origin.map.center must be a coordinate pair.');
  if (!Array.isArray(map.highlightedCountryIds) || map.highlightedCountryIds.length > 24) {
    throw new Error('origin.map.highlightedCountryIds is invalid.');
  }
  return {
    label: text(origin.label, 'origin.label', 160),
    region: text(origin.region, 'origin.region', 240),
    markers,
    map: {
      center: [finite(map.center[0], 'origin.map.center[0]', -180, 180), finite(map.center[1], 'origin.map.center[1]', -90, 90)],
      scale: finite(map.scale, 'origin.map.scale', 1, 10_000),
      highlightedCountryIds: map.highlightedCountryIds.map((id, index) => text(id, `origin.map.highlightedCountryIds[${index}]`, 12)),
    },
  };
}

function parseHistory(value: unknown): RecipeEditorialEnrichment['history'] {
  const history = record(value, 'history');
  exactKeys(history, ['paragraphs', 'sources'], 'history');
  if (!Array.isArray(history.paragraphs) || history.paragraphs.length < 2 || history.paragraphs.length > 4) {
    throw new Error('history.paragraphs must contain two to four paragraphs.');
  }
  if (!Array.isArray(history.sources) || history.sources.length < 1 || history.sources.length > 12) {
    throw new Error('history.sources must contain one to twelve sources.');
  }
  const paragraphs = history.paragraphs.map((paragraph, index) => text(paragraph, `history.paragraphs[${index}]`, 2_000));
  const sources = history.sources.map((value, index) => {
    const path = `history.sources[${index}]`;
    const source = record(value, path);
    exactKeys(source, ['title', 'publisher', 'url'], path);
    const url = text(source.url, `${path}.url`, 2_000);
    if (!/^https:\/\//.test(url)) throw new Error(`${path}.url must use https.`);
    return { title: text(source.title, `${path}.title`, 300), publisher: text(source.publisher, `${path}.publisher`, 200), url };
  });
  if (new Set(sources.map(({ url }) => url)).size !== sources.length) throw new Error('history.sources urls must be unique.');
  return { paragraphs, sources };
}

function parseHeroImage(value: unknown): RecipeHeroImageState {
  const image = record(value, 'heroImage');
  exactKeys(image, ['state', 'storageRef', 'altText', 'width', 'height'], 'heroImage');
  if (!['missing', 'queued', 'editorial_review', 'approved', 'published'].includes(String(image.state))) {
    throw new Error('heroImage.state is invalid.');
  }
  const storageRef = image.storageRef === null ? null : text(image.storageRef, 'heroImage.storageRef', 2_000);
  const altText = image.altText === null ? null : text(image.altText, 'heroImage.altText', 500);
  const width = nullableInteger(image.width, 'heroImage.width');
  const height = nullableInteger(image.height, 'heroImage.height');
  if ((image.state === 'approved' || image.state === 'published') && (!storageRef || !/^https:\/\//.test(storageRef) || !altText || !width || !height)) {
    throw new Error('Approved and published hero images require HTTPS media, alt text, width, and height.');
  }
  return { state: image.state as RecipeHeroImageState['state'], storageRef, altText, width, height };
}

function phraseOccurrences(value: string, phrase: string): number {
  if (!phrase) return 0;
  let count = 0;
  let cursor = 0;
  while (cursor <= value.length - phrase.length) {
    const index = value.indexOf(phrase, cursor);
    if (index < 0) break;
    count += 1;
    cursor = index + phrase.length;
  }
  return count;
}

export function parseRecipeEditorialEnrichment(
  value: unknown,
  instructions: readonly string[],
  canonicalIngredients: readonly string[] = [],
): RecipeEditorialEnrichment {
  const row = record(value, 'recipeEditorialEnrichment');
  const legacy = row.schemaVersion === 1;
  const current = row.schemaVersion === 2;
  if (!legacy && !current) throw new Error('schemaVersion is invalid.');
  exactKeys(row, legacy
    ? ['schemaVersion', 'rosterId', 'sourceRecipeHash', 'review', 'equipmentNeeds', 'equipmentAnnotations', 'origin', 'history', 'heroImage']
    : ['schemaVersion', 'rosterId', 'sourceRecipeHash', 'review', 'costTier', 'difficulty', 'structuredIngredients', 'instructionQuantityPhrases', 'commerce', 'publication', 'equipmentNeeds', 'equipmentAnnotations', 'origin', 'history', 'heroImage'],
  'recipeEditorialEnrichment');
  const rosterId = text(row.rosterId, 'rosterId', 5);
  if (!/^(BR|LU|DI|SO|SA|AP|SI|BA|DE)\d{3}$/.test(rosterId)) throw new Error('rosterId is invalid.');
  const sourceRecipeHash = text(row.sourceRecipeHash, 'sourceRecipeHash', 71);
  if (!/^sha256:[a-f0-9]{64}$/.test(sourceRecipeHash)) throw new Error('sourceRecipeHash is invalid.');
  const review = record(row.review, 'review');
  exactKeys(review, legacy ? ['state', 'reviewedAt', 'reviewedBy'] : ['state', 'reviewedAt', 'reviewedBy', 'sections'], 'review');
  if (legacy ? review.state !== 'reviewed' : review.state !== 'in_progress' && review.state !== 'reviewed') {
    throw new Error('review.state is invalid.');
  }
  const reviewedAt = text(review.reviewedAt, 'review.reviewedAt', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt)) throw new Error('review.reviewedAt is invalid.');
  if (!Array.isArray(row.equipmentNeeds) || row.equipmentNeeds.length > 24) throw new Error('equipmentNeeds is invalid.');
  if (!Array.isArray(row.equipmentAnnotations) || row.equipmentAnnotations.length > 24) throw new Error('equipmentAnnotations is invalid.');
  const equipmentNeeds = row.equipmentNeeds.map(parseNeed);
  const equipmentAnnotations = row.equipmentAnnotations.map(parseAnnotation);
  const needIds = new Set(equipmentNeeds.map(({ id }) => id));
  if (needIds.size !== equipmentNeeds.length) throw new Error('equipment need ids must be unique.');
  equipmentAnnotations.forEach((annotation, index) => {
    if (!needIds.has(annotation.needId)) throw new Error(`equipmentAnnotations[${index}] references a missing need.`);
    const instruction = instructions[annotation.instructionIndex];
    if (instruction === undefined || phraseOccurrences(instruction, annotation.phrase) !== 1) {
      throw new Error(`equipmentAnnotations[${index}].phrase must appear exactly once in its instruction.`);
    }
  });
  const heroImage = parseHeroImage(row.heroImage);
  const sections = legacy
    ? {
        cookingTruth: 'reviewed' as const,
        structuredIngredients: 'pending' as const,
        originHistory: 'reviewed' as const,
        equipment: (equipmentNeeds.length ? 'reviewed' : 'pending') as RecipeEditorialReviewState,
        commerce: 'pending' as const,
        sitePublication: 'pending' as const,
      }
    : (() => {
        const value = record(review.sections, 'review.sections');
        exactKeys(value, ['cookingTruth', 'structuredIngredients', 'originHistory', 'equipment', 'commerce', 'sitePublication'], 'review.sections');
        if (value.sitePublication !== 'pending' && value.sitePublication !== 'ready' && value.sitePublication !== 'published') {
          throw new Error('review.sections.sitePublication is invalid.');
        }
        return {
          cookingTruth: parseReviewState(value.cookingTruth, 'review.sections.cookingTruth'),
          structuredIngredients: parseReviewState(value.structuredIngredients, 'review.sections.structuredIngredients'),
          originHistory: parseReviewState(value.originHistory, 'review.sections.originHistory'),
          equipment: parseReviewState(value.equipment, 'review.sections.equipment'),
          commerce: parseReviewState(value.commerce, 'review.sections.commerce'),
          sitePublication: value.sitePublication as 'pending' | 'ready' | 'published',
        };
      })();
  const costTier = legacy ? null : row.costTier;
  if (costTier !== null && costTier !== '$' && costTier !== '$$' && costTier !== '$$$') throw new Error('costTier is invalid.');
  const difficulty = legacy ? null : row.difficulty;
  if (difficulty !== null && difficulty !== 'Easy' && difficulty !== 'Moderate' && difficulty !== 'Advanced') {
    throw new Error('difficulty is invalid.');
  }
  const structuredIngredients = parseStructuredIngredients(
    legacy ? [] : row.structuredIngredients,
    canonicalIngredients,
    sections.structuredIngredients === 'reviewed',
  );
  const instructionQuantityPhrases = parseInstructionQuantityPhrases(legacy ? {} : row.instructionQuantityPhrases, instructions);
  const commerce = legacy
    ? { decision: 'pending' as const, needId: null, reviewCategoryId: null, rationale: null, noPurchaseAlternative: null }
    : parseCommerce(row.commerce, sections.commerce === 'reviewed');
  const publication = legacy ? { slug: null, publishedAt: null } : parsePublication(row.publication);
  if (sections.sitePublication === 'published' && (!publication.slug || !publication.publishedAt || heroImage.state !== 'published')) {
    throw new Error('Published Site Recipes require a slug, publication date, and published hero image.');
  }
  return {
    schemaVersion: 2,
    rosterId,
    sourceRecipeHash,
    review: {
      state: legacy ? 'in_progress' : review.state as 'in_progress' | 'reviewed',
      reviewedAt,
      reviewedBy: text(review.reviewedBy, 'review.reviewedBy', 160),
      sections,
    },
    costTier: costTier as RecipeEditorialCostTier | null,
    difficulty: difficulty as RecipeEditorialDifficulty | null,
    structuredIngredients,
    instructionQuantityPhrases,
    commerce,
    publication,
    equipmentNeeds,
    equipmentAnnotations,
    origin: parseOrigin(row.origin),
    history: parseHistory(row.history),
    heroImage,
  };
}
