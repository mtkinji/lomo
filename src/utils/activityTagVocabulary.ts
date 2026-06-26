import type { Activity } from '../domain/types';
import type { ActivityTagHistoryIndex } from '../store/useAppStore';

export type ActivityTagVocabularyOption = {
  key: string;
  label: string;
  activeCount: number;
  totalUses: number;
  lastUsedAt: string | null;
};

const CLOSED_STATUSES = new Set(['done', 'skipped', 'cancelled']);

export function normalizeActivityTagKey(tag: string): string {
  return tag.trim().toLowerCase();
}

export function buildActivityTagVocabularyOptions({
  activities,
  activityTagHistory,
  query = '',
  excludeTags,
  limit,
}: {
  activities?: Activity[] | null;
  activityTagHistory?: ActivityTagHistoryIndex | null;
  query?: string;
  excludeTags?: unknown;
  limit?: number;
}): ActivityTagVocabularyOption[] {
  const q = normalizeActivityTagKey(query);
  const excluded = new Set(
    (Array.isArray(excludeTags) ? excludeTags : [])
      .filter((tag): tag is string => typeof tag === 'string')
      .map(normalizeActivityTagKey)
      .filter(Boolean),
  );
  const options = new Map<string, ActivityTagVocabularyOption>();

  const ensure = (tag: string): ActivityTagVocabularyOption | null => {
    const label = tag.trim();
    const key = normalizeActivityTagKey(label);
    if (!key || excluded.has(key)) return null;
    const existing = options.get(key);
    if (existing) return existing;
    const option: ActivityTagVocabularyOption = {
      key,
      label,
      activeCount: 0,
      totalUses: 0,
      lastUsedAt: null,
    };
    options.set(key, option);
    return option;
  };

  Object.values(activityTagHistory ?? {}).forEach((entry) => {
    if (!entry || typeof entry.tag !== 'string') return;
    const option = ensure(entry.tag);
    if (!option) return;
    option.label = entry.tag.trim() || option.label;
    option.totalUses = Math.max(option.totalUses, Number.isFinite(entry.totalUses) ? Number(entry.totalUses) : 0);
    if (typeof entry.lastUsedAt === 'string' && entry.lastUsedAt.trim()) {
      option.lastUsedAt = latestIso(option.lastUsedAt, entry.lastUsedAt.trim());
    }
  });

  (activities ?? []).forEach((activity) => {
    const tags = Array.isArray(activity.tags) ? activity.tags : [];
    tags.forEach((raw) => {
      if (typeof raw !== 'string') return;
      const option = ensure(raw);
      if (!option) return;
      option.totalUses = Math.max(option.totalUses, 1);
      if (!CLOSED_STATUSES.has(activity.status)) {
        option.activeCount += 1;
      }
      if (typeof activity.updatedAt === 'string') {
        option.lastUsedAt = latestIso(option.lastUsedAt, activity.updatedAt);
      }
    });
  });

  const sorted = [...options.values()]
    .filter((option) => {
      if (option.activeCount <= 0 && option.totalUses <= 0) return false;
      if (!q) return true;
      return option.key.includes(q);
    })
    .sort((a, b) => compareTagVocabularyOptions(a, b, q));

  return typeof limit === 'number' ? sorted.slice(0, Math.max(0, limit)) : sorted;
}

export function findExistingTagLabel(
  candidate: string,
  options: Array<Pick<ActivityTagVocabularyOption, 'key' | 'label'>>,
): string | null {
  const key = normalizeActivityTagKey(candidate);
  if (!key) return null;
  return options.find((option) => option.key === key)?.label ?? null;
}

function compareTagVocabularyOptions(
  a: ActivityTagVocabularyOption,
  b: ActivityTagVocabularyOption,
  query: string,
): number {
  if (query) {
    const aExact = a.key === query ? 1 : 0;
    const bExact = b.key === query ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;

    const aPrefix = a.key.startsWith(query) ? 1 : 0;
    const bPrefix = b.key.startsWith(query) ? 1 : 0;
    if (aPrefix !== bPrefix) return bPrefix - aPrefix;
  }

  if (a.activeCount !== b.activeCount) return b.activeCount - a.activeCount;

  const aTime = a.lastUsedAt ? Date.parse(a.lastUsedAt) : Number.NEGATIVE_INFINITY;
  const bTime = b.lastUsedAt ? Date.parse(b.lastUsedAt) : Number.NEGATIVE_INFINITY;
  if (Number.isFinite(aTime) || Number.isFinite(bTime)) {
    if (aTime !== bTime) return bTime - aTime;
  }

  if (a.totalUses !== b.totalUses) return b.totalUses - a.totalUses;
  return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
}

function latestIso(current: string | null, candidate: string): string {
  if (!current) return candidate;
  const currentMs = Date.parse(current);
  const candidateMs = Date.parse(candidate);
  if (!Number.isFinite(currentMs)) return candidate;
  if (!Number.isFinite(candidateMs)) return current;
  return candidateMs > currentMs ? candidate : current;
}
