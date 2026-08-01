import { buildRunContext } from './buildRunContext';
import type { BuiltRunContext } from './capabilityContracts';
import {
  collectCapabilityEvidence,
  type UnifiedChatCapabilitySnapshots,
} from './capabilityAdapters';
import type { UnifiedChatRepository } from './threadRepository';
import type { UnifiedChatCapabilityId, UnifiedChatRequestPolicy } from './requestPolicy';
import type { UnifiedChatContextRef, UnifiedChatRun } from './types';
import type { UnifiedChatTextAttachment } from './unifiedChatAttachmentPolicy';
import { buildPlanRecommendations, resolvePlanTargetDate } from './planRecommendationTool';
import { loadPlanAgentContext } from '../../services/plan/loadPlanAgentContext';
import { getKwiltCalendarBlocksForDay } from '../../services/plan/kwiltCalendarBlocks';
import type { MoneySnapshot } from '../../capabilities/money/data/moneySnapshot';

type ContextRepository = Pick<
  UnifiedChatRepository,
  'appendRunEvents' | 'persistRunEvidence'
>;

export const EMPTY_CAPABILITY_SNAPSHOTS: UnifiedChatCapabilitySnapshots = {
  goals: { goals: [] },
  todos: { activities: [], goals: [] },
  chapters: { chapters: [] },
  profile: { profile: null },
};

export async function loadMoneySnapshotForChat<TClient>(
  repository: { loadSnapshot: () => Promise<MoneySnapshot> },
  client: TClient,
  project: (client: TClient, snapshot: MoneySnapshot) => Promise<{ snapshot: MoneySnapshot } | null>,
): Promise<MoneySnapshot> {
  const snapshot = await repository.loadSnapshot();
  const projection = await project(client, snapshot);
  return projection?.snapshot ?? snapshot;
}

async function loadDefaultMoneySnapshot(): Promise<MoneySnapshot> {
  const [{ createMoneyRepository }, { loadMoneyPlanProjection }, { getSupabaseClient }] = await Promise.all([
    import('../../capabilities/money/data/moneyRepository'),
    import('../../capabilities/money/data/moneyPlanProjection'),
    import('../../services/backend/supabaseClient'),
  ]);
  return loadMoneySnapshotForChat(createMoneyRepository(), getSupabaseClient(), loadMoneyPlanProjection);
}

export async function loadDefaultCapabilitySnapshots(
  capabilities: readonly UnifiedChatCapabilityId[],
  request: { prompt: string },
): Promise<UnifiedChatCapabilitySnapshots> {
  const [{ useAppStore }, { fetchMyChapters }] = await Promise.all([
    import('../../store/useAppStore'),
    import('../../services/chapters'),
  ]);
  const state = useAppStore.getState();
  const chapters = capabilities.includes('chapters')
    ? await fetchMyChapters({ limit: 20, throwOnError: true })
    : [];
  const money = capabilities.includes('money')
    ? await loadDefaultMoneySnapshot()
    : undefined;
  const screenTime = capabilities.includes('screenTime')
    ? await (await import('./loadFamilyScreenTimeChatSnapshot')).loadFamilyScreenTimeChatSnapshot(
        (await import('../../services/backend/supabaseClient')).getSupabaseClient(),
      )
    : undefined;
  const targetDate = resolvePlanTargetDate(
    new Date(),
    /\btomorrow\b/i.test(request.prompt) ? 'tomorrow' : 'today',
  );
  const planCalendarContext = capabilities.includes('plan')
    ? await loadPlanAgentContext({
        targetDate,
        kwiltBusyIntervals: getKwiltCalendarBlocksForDay(state.activities, targetDate)
          .map((block) => ({ start: block.start, end: block.end })),
      })
    : null;
  const plan = capabilities.includes('plan') && planCalendarContext
    ? {
        ...buildPlanRecommendations({
          activities: state.activities,
          goals: state.goals,
          arcs: state.arcs,
          userProfile: state.userProfile,
          targetDate,
          busyIntervals: planCalendarContext.busyIntervals,
          writeCalendarId: planCalendarContext.writeCalendarRef?.calendarId ?? null,
          maxItems: 4,
          activityAreas: state.activityAreas,
        }),
        writeCalendarRef: planCalendarContext.writeCalendarRef,
        limitation: planCalendarContext.limitation,
      }
    : undefined;
  return {
    arcs: { arcs: state.arcs },
    goals: { goals: state.goals, arcIds: state.arcs.map((arc) => arc.id) },
    todos: { activities: state.activities, goals: state.goals },
    chapters: { chapters },
    profile: { profile: state.userProfile },
    account: {
      showUp: {
        lastShowUpDate: state.lastShowUpDate,
        currentShowUpStreak: state.currentShowUpStreak,
        currentCoveredShowUpStreak: state.currentCoveredShowUpStreak,
        eligibleRepairUntilMs: state.streakBreakState.eligibleRepairUntilMs,
        observedAt: state.streakUpdatedAtIso,
      },
    },
    money,
    plan,
    screenTime,
  };
}

function persistenceRows(context: BuiltRunContext) {
  const common = {
    sufficient: context.coverage.sufficient,
    omittedCount: context.coverage.omittedCount,
    coverageNote: context.coverage.note,
  };
  return [
    ...context.evidence.map((evidence, index) => ({
      sequence: index + 1,
      capabilityId: evidence.capabilityId,
      objectType: evidence.object.type,
      objectId: evidence.object.id,
      label: evidence.object.label,
      selectionStatus: 'included' as const,
      authority: evidence.authority,
      freshness: evidence.freshness,
      observedAt: evidence.observedAt,
      provenance: { source: evidence.capabilityId, object: evidence.object },
      selectionReason: evidence.includedBecause,
      ...common,
    })),
    ...context.omissions.map((omission, index) => ({
      sequence: context.evidence.length + index + 1,
      capabilityId: omission.capabilityId,
      objectType: omission.objectType,
      objectId: omission.objectId,
      label: omission.label,
      selectionStatus: 'omitted' as const,
      authority: omission.authority,
      freshness: omission.freshness,
      observedAt: omission.observedAt,
      provenance: { source: omission.capabilityId },
      selectionReason: omission.reason,
      ...common,
    })),
  ];
}

export type AuthorizeUnifiedChatContextPhaseInput = {
  prompt: string;
  run: UnifiedChatRun;
  requestPolicy: UnifiedChatRequestPolicy;
  activeContext: UnifiedChatContextRef[];
  turnAttachments: UnifiedChatTextAttachment[];
  repository: ContextRepository;
  loadCapabilitySnapshots: (
    capabilities: readonly UnifiedChatCapabilityId[],
    request: { prompt: string },
  ) => Promise<UnifiedChatCapabilitySnapshots>;
};

export type AuthorizedUnifiedChatContext = {
  snapshots: UnifiedChatCapabilitySnapshots;
  context: BuiltRunContext;
};

export async function authorizeUnifiedChatContextPhase(
  input: AuthorizeUnifiedChatContextPhaseInput,
): Promise<AuthorizedUnifiedChatContext> {
  const snapshots = input.requestPolicy.usePrivateContext
    ? await input.loadCapabilitySnapshots(
        input.requestPolicy.participatingCapabilities,
        { prompt: input.prompt },
      )
    : EMPTY_CAPABILITY_SNAPSHOTS;
  const sources = input.requestPolicy.usePrivateContext
    ? collectCapabilityEvidence({
        participatingCapabilities: input.requestPolicy.participatingCapabilities,
        snapshots,
      })
    : [];
  const context = buildRunContext({
    prompt: input.prompt,
    policy: input.requestPolicy,
    sources,
    explicitContextObjectIds: input.activeContext.map((item) => item.objectId),
  });

  await input.repository.appendRunEvents({
    threadId: input.run.threadId,
    runId: input.run.id,
    events: [
      {
        sequence: 1,
        type: 'scope',
        status: 'complete',
        visibility: 'user',
        label: input.requestPolicy.usePrivateContext
          ? `Scoped to ${input.requestPolicy.participatingCapabilities.length} Kwilt ${input.requestPolicy.participatingCapabilities.length === 1 ? 'capability' : 'capabilities'}`
          : 'Answering without private Kwilt context',
      },
      {
        sequence: 2,
        type: 'evidence',
        status: input.turnAttachments.some((item) => item.status === 'partial')
          ? 'warning'
          : context.coverage.sufficient ? 'complete' : 'warning',
        visibility: 'user',
        label: input.turnAttachments.length > 0
          ? `Inspected ${input.turnAttachments.length} attached ${input.turnAttachments.length === 1 ? 'item' : 'items'}`
          : input.requestPolicy.usePrivateContext
            ? `Checked ${context.coverage.includedCount} relevant Kwilt ${context.coverage.includedCount === 1 ? 'record' : 'records'}`
            : 'No personal records needed',
        detail: input.turnAttachments.length > 0
          ? [
              `Used ${input.turnAttachments.length} explicitly attached ${input.turnAttachments.length === 1 ? 'item' : 'items'} for this request only.`,
              ...input.turnAttachments.filter((item) => item.status === 'partial').map((item) =>
                `${item.name} was only partially inspected: ${item.failureReason ?? 'some content could not be inspected'}.`),
              context.coverage.note,
            ].join(' ')
          : context.coverage.note,
      },
      {
        sequence: 3,
        type: 'response',
        status: 'active',
        visibility: 'user',
        label: 'Preparing a response',
      },
    ],
  });
  await input.repository.persistRunEvidence({
    threadId: input.run.threadId,
    runId: input.run.id,
    evidence: persistenceRows(context),
  });

  return { snapshots, context };
}
