import type { AgeRange } from '../domain/types';

export type MediaRole = 'celebration' | 'instruction';

export type CelebrationKind = 'firstArc' | 'firstGoal' | 'streak' | 'milestone';

export type CelebrationStylePreference = 'cute' | 'minimal' | 'surprise';

export type CelebrationGif = {
  id: string;
  url: string;
};

export type FetchCelebrationGifParams = {
  /**
   * High-level reason for showing this media. Callers can use this to route
   * between different providers or suppress certain roles entirely (for
   * example, disabling celebration GIFs while keeping instructional media).
   */
  role: MediaRole;
  /**
   * Specific moment within that role, such as "firstArc" or "streak".
   */
  kind: CelebrationKind;
  ageRange?: AgeRange;
  stylePreference?: CelebrationStylePreference;
};

/**
 * Lightweight, app-facing entry point for celebration GIFs.
 *
 * For now this returns `null` so the UI can ship without a hard dependency
 * on any third-party media API. The implementation is intentionally kept
 * behind this boundary so we can later:
 *
 * - Plug in GIPHY (or another provider) using an API key and rating filters.
 * - Swap providers or add caching without touching call sites.
 * - Centralize safety controls (e.g., only "g" / "pg" rated content).
 */
export async function fetchCelebrationGif(
  params: FetchCelebrationGifParams,
): Promise<CelebrationGif | null> {
  const _debug = params;
  // TODO: Wire this up to a real provider such as GIPHY.
  //
  // Sketch for a future implementation:
  //
  // 1. Map (kind, ageRange, stylePreference) → a curated list of search terms.
  // 2. Call the provider's search endpoint, e.g.:
  //    GET https://api.giphy.com/v1/gifs/search
  //      ?api_key=YOUR_API_KEY
  //      &q=encodedQuery
  //      &rating=pg
  //      &limit=1
  // 3. Pick a single GIF (or random from top N), normalize to { id, url }.
  // 4. Respect timeouts / offline by returning null on error.
  //
  // Call sites MUST be prepared for the `null` case and render a static
  // fallback illustration or no GIF at all.
  void _debug;
  return null;
}


