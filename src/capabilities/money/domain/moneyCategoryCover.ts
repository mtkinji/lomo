export type MoneyCategoryCover = {
  source: 'unsplash';
  photoId: string;
  imageUrl: string;
  photographerName: string;
  photographerUrl: string;
  sourceUrl: string;
  color: string | null;
};

const COVER_KEYS = [
  'source',
  'photoId',
  'imageUrl',
  'photographerName',
  'photographerUrl',
  'sourceUrl',
  'color',
] as const;
const MAX_COVER_BYTES = 4096;

export function validateMoneyCategoryCover(value: unknown): MoneyCategoryCover | null {
  if (value == null) return null;
  if (!isRecord(value)) throw new Error('Choose a valid Unsplash cover.');
  if (utf8ByteLength(JSON.stringify(value)) > MAX_COVER_BYTES) throw new Error('Cover metadata must stay under 4 KB.');
  const unknownKeys = Object.keys(value).filter((key) => !COVER_KEYS.includes(key as typeof COVER_KEYS[number]));
  if (unknownKeys.length > 0) throw new Error('Cover metadata contains unknown fields.');
  if (value.source !== 'unsplash') throw new Error('Cover source must be Unsplash.');
  const photoId = requireTrimmedString(value.photoId, 'Unsplash photo id');
  const photographerName = requireTrimmedString(value.photographerName, 'Unsplash photographer name');
  const imageUrl = requireHttpsUrl(value.imageUrl, 'Unsplash image');
  const photographerUrl = requireHttpsUrl(value.photographerUrl, 'Unsplash photographer');
  const sourceUrl = requireHttpsUrl(value.sourceUrl, 'Unsplash page');
  if (imageUrl.hostname !== 'images.unsplash.com') throw new Error('Choose an Unsplash image URL.');
  if (!isUnsplashPageHost(photographerUrl.hostname)) throw new Error('Choose an Unsplash photographer URL.');
  if (!isUnsplashPageHost(sourceUrl.hostname)) throw new Error('Choose an Unsplash page URL.');
  const color = value.color == null ? null : requireTrimmedString(value.color, 'cover color');
  if (color != null && !/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Choose a valid cover color.');
  return {
    source: 'unsplash',
    photoId,
    imageUrl: imageUrl.toString(),
    photographerName,
    photographerUrl: photographerUrl.toString(),
    sourceUrl: sourceUrl.toString(),
    color,
  };
}

export function parseMoneyCategoryCover(value: unknown): MoneyCategoryCover | null {
  try {
    return validateMoneyCategoryCover(value);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireTrimmedString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Enter a valid ${label}.`);
  return value.trim();
}

function requireHttpsUrl(value: unknown, label: string): URL {
  const normalized = requireTrimmedString(value, label);
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`Enter a valid ${label} URL.`);
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error(`Use a secure ${label} URL.`);
  return parsed;
}

function isUnsplashPageHost(hostname: string): boolean {
  return hostname === 'unsplash.com' || hostname === 'www.unsplash.com';
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}
