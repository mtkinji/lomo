// Per-chapter "read at" timestamps persisted in AsyncStorage.
//
// Phase 2.2 of docs/chapters-plan.md: drives the unread dot on
// history cards. We intentionally use AsyncStorage (not a Supabase column)
// for V1 — the metric doesn't yet justify a schema migration, and a proper
// server-side `read_at` can come later if the signal turns out to matter.
//
// The storage shape is a single JSON blob keyed by chapter id:
//
//   { "<chapterId>": "2026-04-17T09:14:00.000Z", ... }
//
// Reads are best-effort and fail open (return empty). Writes coalesce
// consecutive marks within a short window so tapping a chapter doesn't
// thrash storage when the detail screen re-renders.

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'kwilt.chapters.readAt.v1';

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
      // Best-effort notification; subscribers must not throw.
    }
  }
}

export async function getChapterReadMap(): Promise<Record<string, string>> {
  if (cache) return cache;
  if (!loadPromise) {
    loadPromise = loadFromStorage().then((map) => {
      cache = map;
      return map;
    });
  }
  return loadPromise;
}

/** Synchronous snapshot of the cache; empty until `getChapterReadMap` has resolved. */
export function getChapterReadMapSync(): Record<string, string> {
  return cache ?? {};
}

export async function markChapterRead(chapterId: string): Promise<void> {
  const id = (chapterId ?? '').trim();
  if (!id) return;
  const current = await getChapterReadMap();
  if (current[id]) return; // Already read; preserve first-seen timestamp.
  const nextMap = { ...current, [id]: new Date().toISOString() };
  cache = nextMap;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextMap));
  } catch {
    // Best-effort; the in-memory cache still reflects the read so the dot clears.
  }
  notify();
}

export function subscribeChapterReadChanges(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

/** Test-only helper; do not call from production code. */
export async function __resetChapterReadStateForTest(): Promise<void> {
  cache = null;
  loadPromise = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
