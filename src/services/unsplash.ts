import { getEnvVar } from '../utils/getEnv';

export type UnsplashPhoto = {
  id: string;
  width?: number;
  height?: number;
  description?: string | null;
  alt_description?: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  color?: string | null;
  user: {
    name: string;
    links: {
      html: string;
    };
  };
  links: {
    html: string;
  };
};

export type UnsplashSearchResponse = {
  results: UnsplashPhoto[];
};

export type UnsplashErrorCode = 'missing_access_key' | 'http_error' | 'invalid_response';

export class UnsplashError extends Error {
  code: UnsplashErrorCode;
  status?: number;

  constructor(code: UnsplashErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'UnsplashError';
    this.code = code;
    this.status = status;
  }
}

const UNSPLASH_API_BASE = 'https://api.unsplash.com';

function getUnsplashAccessKey(): string | undefined {
  return getEnvVar<string>('unsplashAccessKey');
}

export function withUnsplashReferral(url: string): string {
  const raw = String(url ?? '').trim();
  if (!raw) return raw;
  try {
    const parsed = new URL(raw);
    // Required by Unsplash guidelines.
    if (!parsed.searchParams.get('utm_source')) {
      parsed.searchParams.set('utm_source', 'Kwilt');
    }
    if (!parsed.searchParams.get('utm_medium')) {
      parsed.searchParams.set('utm_medium', 'referral');
    }
    return parsed.toString();
  } catch {
    // If the URL can't be parsed (shouldn't happen for Unsplash html links),
    // return it unchanged.
    return raw;
  }
}

export async function trackUnsplashDownload(photoId: string): Promise<void> {
  const accessKey = getUnsplashAccessKey();
  const id = String(photoId ?? '').trim();
  if (!accessKey || !id) return;

  // Unsplash API guideline: trigger the download endpoint when a user uses a photo.
  await fetch(`${UNSPLASH_API_BASE}/photos/${encodeURIComponent(id)}/download`, {
    method: 'GET',
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      Accept: 'application/json',
      'Accept-Version': 'v1',
    },
  }).then(() => undefined);
}

export async function searchUnsplashPhotos(
  query: string,
  options: {
    perPage?: number;
    page?: number;
    orientation?: 'landscape' | 'portrait' | 'squarish';
  } = {}
): Promise<UnsplashPhoto[]> {
  const accessKey = getUnsplashAccessKey();
  if (!accessKey) {
    throw new UnsplashError(
      'missing_access_key',
      'Image library search is not configured for this build (missing access key).'
    );
  }

  const perPage = options.perPage ?? 12;
  const page = options.page ?? 1;

  const params = new URLSearchParams({
    query,
    per_page: String(perPage),
    page: String(page),
    content_filter: 'high',
  });
  if (options.orientation) {
    params.set('orientation', options.orientation);
  }

  const response = await fetch(`${UNSPLASH_API_BASE}/search/photos?${params.toString()}`, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      Accept: 'application/json',
      'Accept-Version': 'v1',
    },
  });

  if (!response.ok) {
    // Attempt to surface a meaningful message from the image library API.
    let message = `Image library request failed (HTTP ${response.status}).`;
    try {
      const maybeJson = (await response.json()) as unknown;
      if (
        maybeJson &&
        typeof maybeJson === 'object' &&
        'errors' in maybeJson &&
        Array.isArray((maybeJson as any).errors) &&
        typeof (maybeJson as any).errors[0] === 'string'
      ) {
        message = (maybeJson as any).errors[0];
      }
    } catch {
      // ignore parsing failures
    }
    throw new UnsplashError('http_error', message, response.status);
  }

  try {
    const data: UnsplashSearchResponse = await response.json();
    return data.results ?? [];
  } catch {
    throw new UnsplashError('invalid_response', 'Unable to parse image library response.');
  }
}
