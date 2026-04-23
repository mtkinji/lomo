// Per-recommendation dismissals for the Next Steps section.
//
// Phase 5.2 of docs/chapters-plan.md: tapping "Not now" on a Next
// Steps card should sleep that same recommendation for 90 days. The
// dismissal key is the recommendation's *stable* id
// (e.g. `rec-arc-workfront`) — NOT the chapter id — so the same
// recommendation suppresses itself across any Chapter that re-surfaces it.
//
// V1 persistence: AsyncStorage only. We mirror the pattern in
// `chapterReadState.ts`. A server-side column is deferred until the
// signal justifies the migration — cross-device dismissal sync is nice
// but not critical; a user who upgrades a device will see at most one
// already-seen nomination re-appear, which is a minor annoyance, not a
// product bug.
//
// Storage shape (single JSON blob):
//
//   { "<recommendationId>": "<ISO timestamp when dismissed>", ... }
//
// Reads are best-effort and fail open. `isRecommendationDismissed`
// returns `false` when the dismissal is older than the 90-day window,
// effectively unsleeping the recommendation so the Chapter generator's
// re-trigger can surface it again.

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'kwilt.chapters.recDismissedAt.v1';
const DISMISSAL_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

let cache: Record<string, string> | null = null;
let loadPromise: Promise<Record<string, string>> | null = null;
const subscribers = new Set<() => void>();

async function loadFromStorage(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof k === 'string' && typeof v === 'string') clean[k] = v;
      }
      return clean;
    }
    return {};
  } catch {
    return {};
  }
}

function notify(): void {
  for (const fn of subscribers) {
    try {
      fn();
    } catch {
      // Best-effort; subscribers must not throw.
    }
  }
}

export async function getRecommendationDismissalMap(): Promise<Record<string, string>> {
  if (cache) return cache;
  if (!loadPromise) {
    loadPromise = loadFromStorage().then((map) => {
      cache = map;
      return map;
    });
  }
  return loadPromise;
}

/** Synchronous snapshot; empty until `getRecommendationDismissalMap` resolves. */
export function getRecommendationDismissalMapSync(): Record<string, string> {
  return cache ?? {};
}

export function isRecommendationDismissed(
  recommendationId: string,
  nowMs: number = Date.now(),
): boolean {
  const map = getRecommendationDismissalMapSync();
  const iso = map[recommendationId];
  if (!iso) return false;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return false;
  return nowMs - ms < DISMISSAL_WINDOW_MS;
}

export async function dismissRecommendation(recommendationId: string): Promise<void> {
  const id = (recommendationId ?? '').trim();
  if (!id) return;
  const current = await getRecommendationDismissalMap();
  const nextMap = { ...current, [id]: new Date().toISOString() };
  cache = nextMap;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextMap));
  } catch {
    // Best-effort; cache still reflects the dismissal so the UI hides the card.
  }
  notify();
}

export function subscribeRecommendationDismissalChanges(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

/** Test-only helper; do not call from production code. */
export async function __resetRecommendationDismissalsForTest(): Promise<void> {
  cache = null;
  loadPromise = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
