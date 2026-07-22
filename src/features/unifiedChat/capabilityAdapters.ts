import type { Activity, Goal, Metric } from '../../domain/types';
import { getChapterHistorySnippet } from '../chapters/chapterSnippet';
import type { ChapterRow } from '../../services/chapters';
import type {
  CapabilityChatAdapter,
  CapabilityEvidenceSource,
  CapabilityNativeReturnTarget,
  CapabilityObjectRef,
} from './capabilityContracts';
import type { UnifiedChatCapabilityId } from './requestPolicy';

export type GoalsChatSnapshot = { goals: readonly Goal[] };
export type TodosChatSnapshot = { activities: readonly Activity[]; goals: readonly Goal[] };
export type ChaptersChatSnapshot = { chapters: readonly ChapterRow[] };

export type UnifiedChatCapabilitySnapshots = {
  goals: GoalsChatSnapshot;
  todos: TodosChatSnapshot;
  chapters: ChaptersChatSnapshot;
};

const READ_ONLY_OPERATIONS = [] as const;
const ACTIVITY_OPERATIONS = ['create_activity', 'update_activity'] as const;

function compact(values: Array<string | null | undefined>): string {
  return values.filter((value): value is string => Boolean(value?.trim())).join(' · ');
}

function formatDate(dateValue: string | null | undefined): string | null {
  if (!dateValue) return null;
  const date = new Date(dateValue.length === 10 ? `${dateValue}T12:00:00.000Z` : dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function formatDateRange(startValue: string, endValue: string): string {
  const start = new Date(`${startValue}T12:00:00.000Z`);
  const end = new Date(`${endValue}T12:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return compact([formatDate(startValue), formatDate(endValue)]);
  }
  if (start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth()) {
    const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(start);
    return `${month} ${start.getUTCDate()}–${end.getUTCDate()}, ${end.getUTCFullYear()}`;
  }
  return compact([formatDate(startValue), formatDate(endValue)]).replace(' · ', '–');
}

function sentenceCase(value: string): string {
  const spaced = value.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function metricSummary(metric: Metric): string {
  const target = metric.target == null ? '' : `target ${metric.target}${metric.unit ? ` ${metric.unit}` : ''}`;
  const baseline = metric.baseline == null ? '' : `from ${metric.baseline}${metric.unit ? ` ${metric.unit}` : ''}`;
  return compact([metric.label, target, baseline]).replace(/ · /g, ': ').trim();
}

function nativeReturn(
  capabilityId: 'goals' | 'todos' | 'chapters',
  object: CapabilityObjectRef,
): CapabilityNativeReturnTarget {
  if (capabilityId === 'goals') {
    return {
      capabilityId,
      object: { type: object.type, id: object.id },
      label: object.label,
      route: {
        name: 'MainTabs',
        params: {
          screen: 'GoalsTab',
          params: { screen: 'GoalDetail', params: { goalId: object.id } },
        },
      },
    };
  }
  if (capabilityId === 'todos') {
    return {
      capabilityId,
      object: { type: object.type, id: object.id },
      label: object.label,
      route: {
        name: 'MainTabs',
        params: {
          screen: 'ActivitiesTab',
          params: { screen: 'ActivityDetail', params: { activityId: object.id } },
        },
      },
    };
  }
  return {
    capabilityId,
    object: { type: object.type, id: object.id },
    label: object.label,
    route: {
      name: 'MainTabs',
      params: {
        screen: 'MoreTab',
        params: { screen: 'MoreChapterDetail', params: { chapterId: object.id } },
      },
    },
  };
}

function goalEvidence(goal: Goal): CapabilityEvidenceSource {
  const status = sentenceCase(goal.status);
  const target = formatDate(goal.targetDate);
  const metrics = goal.metrics.map(metricSummary).filter(Boolean);
  const object: CapabilityObjectRef = {
    type: 'goal',
    id: goal.id,
    label: goal.title,
    secondaryLabel: compact([
      status,
      goal.priority ? `Priority ${goal.priority}` : null,
      target ? `Target ${target}` : null,
    ]),
  };
  return {
    capabilityId: 'goals',
    object,
    searchableText: compact([
      goal.title,
      goal.description,
      status,
      target,
      metrics.join(' '),
    ]),
    summary: compact([
      goal.description,
      `Status: ${status}`,
      target ? `Target: ${target}` : null,
      ...metrics,
    ]),
    authority: 'authoritative',
    observedAt: goal.updatedAt,
  };
}

function activityEvidence(activity: Activity, goalById: ReadonlyMap<string, Goal>): CapabilityEvidenceSource {
  const status = sentenceCase(activity.status);
  const scheduled = formatDate(activity.scheduledDate ?? activity.scheduledAt);
  const goalTitle = activity.goalId ? goalById.get(activity.goalId)?.title : null;
  return {
    capabilityId: 'todos',
    object: {
      type: 'activity',
      id: activity.id,
      label: activity.title,
      secondaryLabel: compact([status, goalTitle, scheduled]),
    },
    searchableText: compact([
      activity.title,
      activity.notes,
      activity.tags.join(' '),
      goalTitle,
      status,
      scheduled,
      activity.steps?.map((step) => step.title).join(' '),
    ]),
    summary: compact([
      activity.notes,
      `Status: ${status}`,
      goalTitle ? `Goal: ${goalTitle}` : null,
      scheduled ? `Scheduled: ${scheduled}` : null,
      activity.priority ? `Priority ${activity.priority}` : null,
    ]),
    authority: 'authoritative',
    observedAt: activity.updatedAt,
  };
}

function chapterTitle(chapter: ChapterRow): string {
  const output = chapter.output_json;
  if (output && typeof output === 'object' && typeof output.title === 'string' && output.title.trim()) {
    return output.title.trim();
  }
  return `Chapter ${chapter.period_key}`;
}

function chapterEvidence(chapter: ChapterRow): CapabilityEvidenceSource {
  const title = chapterTitle(chapter);
  const snippet = getChapterHistorySnippet(chapter.output_json);
  const range = formatDateRange(chapter.period_start, chapter.period_end);
  return {
    capabilityId: 'chapters',
    object: {
      type: 'chapter',
      id: chapter.id,
      label: title,
      secondaryLabel: range,
    },
    searchableText: compact([title, snippet, chapter.user_note, chapter.period_key]),
    summary: compact([snippet, chapter.user_note ? `Your note: ${chapter.user_note}` : null]),
    authority: 'derived',
    observedAt: chapter.user_note_updated_at ?? chapter.updated_at,
  };
}

export const goalsChatAdapter: CapabilityChatAdapter<GoalsChatSnapshot> = {
  capabilityId: 'goals',
  context: { dataClassification: 'private_kwilt_data', readOnly: true },
  evidence: { list: ({ goals }) => goals.map(goalEvidence) },
  proposal: { operationKinds: READ_ONLY_OPERATIONS },
  apply: { operationKinds: READ_ONLY_OPERATIONS },
  receipt: { reloadAuthoritativeObject: false },
  undo: { operationKinds: READ_ONLY_OPERATIONS },
  return: { targetFor: (object) => nativeReturn('goals', object) },
};

export const todosChatAdapter: CapabilityChatAdapter<TodosChatSnapshot> = {
  capabilityId: 'todos',
  context: { dataClassification: 'private_kwilt_data', readOnly: false },
  evidence: {
    list: ({ activities, goals }) => {
      const goalById = new Map(goals.map((goal) => [goal.id, goal]));
      return activities.map((item) => activityEvidence(item, goalById));
    },
  },
  proposal: { operationKinds: ACTIVITY_OPERATIONS },
  apply: { operationKinds: ACTIVITY_OPERATIONS },
  receipt: { reloadAuthoritativeObject: true },
  undo: { operationKinds: ACTIVITY_OPERATIONS },
  return: { targetFor: (object) => nativeReturn('todos', object) },
};

export const chaptersChatAdapter: CapabilityChatAdapter<ChaptersChatSnapshot> = {
  capabilityId: 'chapters',
  context: { dataClassification: 'private_kwilt_data', readOnly: true },
  evidence: { list: ({ chapters }) => chapters.map(chapterEvidence) },
  proposal: { operationKinds: READ_ONLY_OPERATIONS },
  apply: { operationKinds: READ_ONLY_OPERATIONS },
  receipt: { reloadAuthoritativeObject: false },
  undo: { operationKinds: READ_ONLY_OPERATIONS },
  return: { targetFor: (object) => nativeReturn('chapters', object) },
};

export function collectCapabilityEvidence({
  participatingCapabilities,
  snapshots,
}: {
  participatingCapabilities: readonly UnifiedChatCapabilityId[];
  snapshots: UnifiedChatCapabilitySnapshots;
}): CapabilityEvidenceSource[] {
  const selected = new Set(participatingCapabilities);
  return [
    ...(selected.has('goals') ? goalsChatAdapter.evidence.list(snapshots.goals) : []),
    ...(selected.has('todos') ? todosChatAdapter.evidence.list(snapshots.todos) : []),
    ...(selected.has('chapters') ? chaptersChatAdapter.evidence.list(snapshots.chapters) : []),
  ];
}

export function resolveUnifiedChatObjectReturn(
  object: CapabilityObjectRef,
): CapabilityNativeReturnTarget | null {
  if (object.type === 'goal') return goalsChatAdapter.return.targetFor(object);
  if (object.type === 'activity') return todosChatAdapter.return.targetFor(object);
  if (object.type === 'chapter') return chaptersChatAdapter.return.targetFor(object);
  return null;
}
