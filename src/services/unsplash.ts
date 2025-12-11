import { getEnvVar } from '../utils/getEnv';

export type UnsplashPhoto = {
  id: string;
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

const UNSPLASH_API_BASE = 'https://api.unsplash.com';

function getUnsplashAccessKey(): string | undefined {
  return getEnvVar<string>('unsplashAccessKey');
}

export async function searchUnsplashPhotos(
  query: string,
  options: { perPage?: number; page?: number } = {}
): Promise<UnsplashPhoto[]> {
  const accessKey = getUnsplashAccessKey();
  if (!accessKey) {
    // When no key is configured, gracefully degrade by returning no results.
    return [];
  }

  const perPage = options.perPage ?? 12;
  const page = options.page ?? 1;

  const params = new URLSearchParams({
    query,
    per_page: String(perPage),
    page: String(page),
    orientation: 'landscape',
    content_filter: 'high',
  });

  const response = await fetch(`${UNSPLASH_API_BASE}/search/photos?${params.toString()}`, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    // Swallow network / quota errors and surface an empty list; callers can
    // choose to show a soft error message when appropriate.
    return [];
  }

  const data: UnsplashSearchResponse = await response.json();
  return data.results ?? [];
}
