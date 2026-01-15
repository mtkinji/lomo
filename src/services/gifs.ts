import type { AgeRange } from '../domain/types';
import { getGiphyApiKey } from '../utils/getEnv';
import { useAppStore } from '../store/useAppStore';

export type MediaRole = 'celebration' | 'instruction';

export type CelebrationKind =
  | 'firstArcCelebrate'
  | 'firstArcDreamsPrompt'
  | 'firstGoal'
  | 'streak'
  | 'milestone'
  /**
   * Legacy kind kept for backwards-compatibility with any persisted data.
   * New call sites should prefer the more specific variants above.
   */
  | 'firstArc'
  // Progress celebrations (Asana-style moments)
  | 'goalCompleted'
  | 'activityCompleted'
  | 'firstActivity'
  | 'weeklyStreak'
  | 'dailyStreak'
  | 'allActivitiesDone'
  | 'streakSaved'; // Grace was used to save the streak

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
  /**
   * When true, bypasses the liked-GIFs cache and always calls the remote API.
   * Useful for explicit "refresh" actions where the user wants something new.
   */
  skipLikedCache?: boolean;
};

const EXCLUDED_KEYWORDS = [
  // Identity/adult themes
  'pride', 'gay', 'lgbt', 'nsfw', 'sexy',
  // Holidays and festivals - these are irrelevant to productivity celebrations
  'christmas', 'xmas', 'new year', 'newyear', 'happy new', '2024', '2025', '2026', '2027',
  'halloween', 'thanksgiving', 'easter', 'valentine', 'st patrick',
  'hanukkah', 'chanukah', 'kwanzaa', 'diwali', 'eid', 'ramadan',
  'lohri', 'holi', 'pongal', 'onam', 'navratri', 'durga',
  'lunar new', 'chinese new', 'spring festival',
  'independence day', '4th of july', 'fourth of july', 'memorial day', 'labor day',
  'birthday', 'anniversary', 'wedding', 'baby shower', 'gender reveal',
  // Political figures and campaigns
  'trump', 'biden', 'obama', 'clinton', 'bush', 'kennedy', 'desantis', 'pence', 'harris',
  'pelosi', 'mcconnell', 'aoc', 'bernie', 'sanders', 'warren', 'cruz', 'rubio',
  'maga', 'democrat', 'republican', 'gop', 'liberal', 'conservative',
  'election', 'vote', 'voting', 'ballot', 'campaign', 'president', 'congress', 'senate',
  'political', 'politician', 'politics',
  // News shows and political media (often source of political GIFs)
  'tucker', 'carlson', 'hannity', 'maddow', 'fox news', 'cnn', 'msnbc',
  'breitbart', 'infowars', 'newsmax', 'oan',
  'joe rogan', 'ben shapiro', 'daily wire', 'podcast',
  // Religious
  'jesus', 'christ', 'church', 'mosque', 'temple', 'bible', 'quran', 'prayer', 'god bless',
  'christian', 'muslim', 'jewish', 'hindu', 'buddhist',
];

function isUnder18(ageRange: AgeRange | undefined): boolean {
  return ageRange === 'under-18';
}

function containsExcludedKeyword(text: string | undefined): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return EXCLUDED_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function buildGiphyQuery(params: FetchCelebrationGifParams): string {
  const { role, kind, stylePreference, ageRange } = params;

  // Base term from role/kind – keep queries upbeat and generic enough to avoid
  // specific holidays or identity themes.
  if (role === 'celebration' && kind === 'firstArcCelebrate') {
    // Big "you did it" confetti moment for the first Arc celebration dialog.
    return 'you did it celebration confetti';
  }
  if (role === 'celebration' && kind === 'firstArcDreamsPrompt') {
    // Softer "almost there, keep going" encouragement for the Part 2 dreams prompt.
    return 'you got this keep going';
  }
  if (role === 'celebration' && kind === 'firstGoal') {
    // Lean slightly into a playful soccer metaphor while keeping things broad.
    return 'small win you did it yes goal soccer goallll celebration';
  }
  if (kind === 'streak') {
    return 'you did it keep going celebration';
  }
  // Progress celebration moments (Asana-style)
  // Be specific to avoid holiday/festival GIFs - use work/productivity context
  if (role === 'celebration' && kind === 'goalCompleted') {
    return 'mission accomplished nailed it success proud';
  }
  if (role === 'celebration' && kind === 'activityCompleted') {
    return 'thumbs up nice work high five approval';
  }
  if (role === 'celebration' && kind === 'firstActivity') {
    return 'first one down proud start beginning';
  }
  if (role === 'celebration' && kind === 'weeklyStreak') {
    return 'crushing it unstoppable momentum winning';
  }
  if (role === 'celebration' && kind === 'dailyStreak') {
    return 'consistent dedicated showing up daily routine';
  }
  if (role === 'celebration' && kind === 'allActivitiesDone') {
    return 'finished done mic drop completed checklist';
  }
  if (role === 'celebration' && kind === 'streakSaved') {
    return 'close call phew saved relief narrow escape';
  }

  let base = 'celebration';

  // Optional tone tweaks based on style preference
  if (stylePreference === 'cute') {
    base = 'cute wholesome celebration';
  } else if (stylePreference === 'minimal') {
    base = 'simple subtle celebration';
  }

  // Age-based soft nudge toward gentler queries
  if (ageRange === 'under-18') {
    base = `kid friendly ${base}`;
  }

  return base;
}

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
  const state = useAppStore.getState();
  const blockedIds = new Set(state.blockedCelebrationGifIds ?? []);
  const useLikedCache = !params.skipLikedCache;

  // 1) Prefer locally liked GIFs for this role/kind to avoid unnecessary API
  // calls and give the user a sense of continuity with favorites.
  if (useLikedCache) {
    const likedForContext = (state.likedCelebrationGifs ?? []).filter(
      (entry) =>
        entry.role === params.role &&
        entry.kind === params.kind &&
        !blockedIds.has(entry.id),
    );
    if (likedForContext.length > 0) {
      const pick = likedForContext[Math.floor(Math.random() * likedForContext.length)];
      return { id: pick.id, url: pick.url };
    }
  }

  const apiKey = getGiphyApiKey();
  if (!apiKey) {
    return null;
  }

  const query = buildGiphyQuery(params);

  const ageRange = params.ageRange;
  const rating = isUnder18(ageRange) ? 'g' : 'pg';

  const searchParams = new URLSearchParams({
    api_key: apiKey,
    q: query,
    rating,
    limit: '10',
    lang: 'en',
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`https://api.giphy.com/v1/gifs/search?${searchParams.toString()}`, {
      signal: controller.signal,
    });

    if (!res.ok) {
      return null;
    }

    const json = (await res.json()) as {
      data?: Array<{
        id: string;
        rating?: string;
        title?: string;
        slug?: string;
        images?: { downsized_medium?: { url?: string } };
      }>;
    };

    const candidates = (json.data ?? []).filter((item) => {
      if (blockedIds.has(item.id)) return false;

      const itemRating = (item.rating ?? '').toLowerCase();
      if (rating === 'g' && itemRating && itemRating !== 'g') {
        return false;
      }

      if (containsExcludedKeyword(item.title) || containsExcludedKeyword(item.slug)) {
        return false;
      }

      return true;
    });

    if (candidates.length === 0) {
      return null;
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const url = pick.images?.downsized_medium?.url;

    if (!url) {
      return null;
    }

    if (__DEV__) {
      // Temporary debug logging for QA / tuning. Keep this human-readable and
      // avoid logging the full media URL; the ID + title are enough to
      // re‑locate a GIF when needed.
      const title = pick.title && pick.title.trim().length > 0 ? pick.title : undefined;
      // eslint-disable-next-line no-console
      console.log('[giphy]', {
        id: pick.id,
        title,
        slug: pick.slug,
        query,
        rating,
        itemRating: pick.rating,
      });
    }

    return { id: pick.id, url };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}


