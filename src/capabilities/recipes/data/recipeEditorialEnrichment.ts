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

export type RecipeEditorialEnrichment = {
  schemaVersion: 1;
  rosterId: string;
  sourceRecipeHash: string;
  review: { state: 'reviewed'; reviewedAt: string; reviewedBy: string };
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
): RecipeEditorialEnrichment {
  const row = record(value, 'recipeEditorialEnrichment');
  exactKeys(row, ['schemaVersion', 'rosterId', 'sourceRecipeHash', 'review', 'equipmentNeeds', 'equipmentAnnotations', 'origin', 'history', 'heroImage'], 'recipeEditorialEnrichment');
  if (row.schemaVersion !== 1) throw new Error('schemaVersion is invalid.');
  const rosterId = text(row.rosterId, 'rosterId', 5);
  if (!/^(BR|LU|DI|SO|SA|AP|SI|BA|DE)\d{3}$/.test(rosterId)) throw new Error('rosterId is invalid.');
  const sourceRecipeHash = text(row.sourceRecipeHash, 'sourceRecipeHash', 71);
  if (!/^sha256:[a-f0-9]{64}$/.test(sourceRecipeHash)) throw new Error('sourceRecipeHash is invalid.');
  const review = record(row.review, 'review');
  exactKeys(review, ['state', 'reviewedAt', 'reviewedBy'], 'review');
  if (review.state !== 'reviewed') throw new Error('review.state is invalid.');
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
  return {
    schemaVersion: 1,
    rosterId,
    sourceRecipeHash,
    review: { state: 'reviewed', reviewedAt, reviewedBy: text(review.reviewedBy, 'review.reviewedBy', 160) },
    equipmentNeeds,
    equipmentAnnotations,
    origin: parseOrigin(row.origin),
    history: parseHistory(row.history),
    heroImage: parseHeroImage(row.heroImage),
  };
}
