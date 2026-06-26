import type { Activity, FilterGroup } from '../../domain/types';
import type { ActivityTagHistoryIndex } from '../../store/useAppStore';
import { buildActivityTagVocabularyOptions, normalizeActivityTagKey } from '../../utils/activityTagVocabulary';

export type ActivityTagGroup = {
  key: string;
  tag: string;
  activeCount: number;
  totalUses: number;
  lastUsedAt: string | null;
};

export function buildActivityTagGroupFilter(tag: string): FilterGroup[] {
  const trimmed = tag.trim();
  if (!trimmed) return [];

  return [
    {
      logic: 'and',
      conditions: [
        {
          id: `tag-group-${normalizeActivityTagKey(trimmed).replace(/[^a-z0-9]+/g, '-') || 'tag'}`,
          field: 'tags',
          operator: 'in',
          value: [trimmed],
        },
      ],
    },
  ];
}

export function buildActivityTagGroups(params: {
  activities: Activity[];
  activityTagHistory?: ActivityTagHistoryIndex | null;
  limit?: number;
}): ActivityTagGroup[] {
  const limit = typeof params.limit === 'number' ? Math.max(0, params.limit) : undefined;
  if (limit === 0) return [];

  return buildActivityTagVocabularyOptions({
    activities: params.activities,
    activityTagHistory: params.activityTagHistory,
    limit,
  }).map((option) => ({
    key: option.key,
    tag: option.label,
    activeCount: option.activeCount,
    totalUses: option.totalUses,
    lastUsedAt: option.lastUsedAt,
  }));
}
