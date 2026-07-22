import type { UnifiedChatCapabilityId } from './requestPolicy';
import type { Activity, Goal } from '../../domain/types';
import type { ChapterRow } from '../../services/chapters';
import {
  collectCapabilityEvidence,
  chaptersChatAdapter,
  goalsChatAdapter,
  todosChatAdapter,
} from './capabilityAdapters';
import type { AttachUnifiedChatContextInput } from './types';

export type UnifiedChatLaunchContext = {
  capabilityId: Extract<UnifiedChatCapabilityId, 'goals' | 'todos' | 'chapters'>;
  surface: 'inventory' | 'detail';
  object?: { type: 'goal' | 'activity' | 'chapter'; id: string };
  returnTarget: Record<string, unknown>;
};

export type UnifiedChatRouteParams = {
  launchContext?: UnifiedChatLaunchContext;
  threadId?: string;
};

export type UnifiedChatLaunchSnapshots = {
  goals: readonly Goal[];
  activities: readonly Activity[];
  chapters: readonly ChapterRow[];
};

export type UnifiedChatAttachableContext = {
  capabilityId: UnifiedChatLaunchContext['capabilityId'];
  objectType: 'goal' | 'activity' | 'chapter';
  objectId: string;
  label: string;
  secondaryLabel: string | null;
  returnTarget: Record<string, unknown>;
};

type LaunchAttachment = Omit<AttachUnifiedChatContextInput, 'threadId' | 'source'>;

const CAPABILITY_LABELS: Record<UnifiedChatLaunchContext['capabilityId'], string> = {
  goals: 'Goals',
  todos: 'To-dos',
  chapters: 'Chapters',
};

/**
 * Turns navigation state into a user-legible, least-private context reference.
 * Detail launches are attached only when the native object still exists.
 */
export function resolveUnifiedChatLaunchAttachment(
  launch: UnifiedChatLaunchContext,
  snapshots: UnifiedChatLaunchSnapshots,
): LaunchAttachment | null {
  if (!launch.object) {
    return {
      capabilityId: launch.capabilityId,
      objectType: 'capability',
      objectId: launch.capabilityId,
      label: CAPABILITY_LABELS[launch.capabilityId],
      secondaryLabel: 'Current capability',
      returnTarget: launch.returnTarget,
    };
  }

  const evidence = launch.capabilityId === 'goals'
    ? goalsChatAdapter.evidence.list({ goals: snapshots.goals })
    : launch.capabilityId === 'todos'
      ? todosChatAdapter.evidence.list({ activities: snapshots.activities, goals: snapshots.goals })
      : chaptersChatAdapter.evidence.list({ chapters: snapshots.chapters });
  const matched = evidence.find(
    (item) => item.object.type === launch.object?.type && item.object.id === launch.object.id,
  );
  if (!matched) return null;

  return {
    capabilityId: launch.capabilityId,
    objectType: matched.object.type,
    objectId: matched.object.id,
    label: matched.object.label,
    secondaryLabel: matched.object.secondaryLabel ?? null,
    returnTarget: launch.returnTarget,
  };
}

export async function loadUnifiedChatLaunchAttachment(
  launch: UnifiedChatLaunchContext,
): Promise<LaunchAttachment | null> {
  const [{ useAppStore }, chapterService] = await Promise.all([
    import('../../store/useAppStore'),
    launch.capabilityId === 'chapters'
      ? import('../../services/chapters')
      : Promise.resolve(null),
  ]);
  const state = useAppStore.getState();
  const chapter = launch.object?.type === 'chapter' && chapterService
    ? await chapterService.fetchMyChapterById(launch.object.id)
    : null;
  return resolveUnifiedChatLaunchAttachment(launch, {
    goals: state.goals,
    activities: state.activities,
    chapters: chapter ? [chapter] : [],
  });
}

export function buildUnifiedChatAttachableContexts(
  snapshots: UnifiedChatLaunchSnapshots,
): UnifiedChatAttachableContext[] {
  const mapped = collectCapabilityEvidence({
    participatingCapabilities: ['goals', 'todos', 'chapters'],
    snapshots: {
      goals: { goals: snapshots.goals },
      todos: { activities: snapshots.activities, goals: snapshots.goals },
      chapters: { chapters: snapshots.chapters },
    },
  });
  return mapped.flatMap((source) => {
    if (source.capabilityId !== 'goals' && source.capabilityId !== 'todos' && source.capabilityId !== 'chapters') return [];
    const target = source.capabilityId === 'goals'
      ? goalsChatAdapter.return.targetFor(source.object)
      : source.capabilityId === 'todos'
        ? todosChatAdapter.return.targetFor(source.object)
        : chaptersChatAdapter.return.targetFor(source.object);
    return [{
      capabilityId: source.capabilityId,
      objectType: source.object.type as 'goal' | 'activity' | 'chapter',
      objectId: source.object.id,
      label: source.object.label,
      secondaryLabel: source.object.secondaryLabel ?? null,
      returnTarget: target.route as unknown as Record<string, unknown>,
    }];
  });
}

export async function loadUnifiedChatAttachableContexts(): Promise<UnifiedChatAttachableContext[]> {
  const [{ useAppStore }, { fetchMyChapters }] = await Promise.all([
    import('../../store/useAppStore'),
    import('../../services/chapters'),
  ]);
  const state = useAppStore.getState();
  const chapters = await fetchMyChapters({ limit: 20, throwOnError: true });
  return buildUnifiedChatAttachableContexts({
    goals: state.goals,
    activities: state.activities,
    chapters,
  });
}
