import type { Activity, Arc, Goal, Metric, UserProfile } from '../../domain/types';
import { getChapterHistorySnippet } from '../chapters/chapterSnippet';
import type { ChapterRow } from '../../services/chapters';
import type {
  CapabilityChatAdapter,
  CapabilityEvidenceSource,
  CapabilityNativeReturnTarget,
  CapabilityObjectRef,
} from './capabilityContracts';
import type { UnifiedChatCapabilityId } from './requestPolicy';
import type { PlanRecommendationResult } from './planRecommendationTool';
import type { CalendarRef } from '../../services/plan/calendarApi';
import { formatMoney, type MoneySnapshot } from '../../capabilities/money/data/moneySnapshot';
import type { FamilyScreenTimeSnapshot } from '../household/screenTime/data/familyScreenTime';

export type GoalsChatSnapshot = { goals: readonly Goal[]; arcIds?: readonly string[] };
export type ArcsChatSnapshot = { arcs: readonly Arc[] };
export type TodosChatSnapshot = { activities: readonly Activity[]; goals: readonly Goal[] };
export type ChaptersChatSnapshot = { chapters: readonly ChapterRow[] };
export type PlanChatSnapshot = PlanRecommendationResult & {
  writeCalendarRef: CalendarRef | null;
  limitation: 'no_write_calendar' | 'calendar_unavailable' | 'partial_calendar_context' | null;
};
export type ProfileChatSnapshot = { profile: UserProfile | null };
export type AccountChatSnapshot = {
  showUp: {
    lastShowUpDate: string | null;
    currentShowUpStreak: number;
    currentCoveredShowUpStreak: number;
    eligibleRepairUntilMs: number | null;
    observedAt: string | null;
  };
};
export type MoneyChatSnapshot = MoneySnapshot;
export type ScreenTimeChatSnapshot = {
  children: ReadonlyArray<{
    membershipId: string;
    displayName: string;
    canManage: boolean;
    policy: FamilyScreenTimeSnapshot;
  }>;
};

export type UnifiedChatCapabilitySnapshots = {
  arcs?: ArcsChatSnapshot;
  goals: GoalsChatSnapshot;
  todos: TodosChatSnapshot;
  chapters: ChaptersChatSnapshot;
  plan?: PlanChatSnapshot;
  profile?: ProfileChatSnapshot;
  account?: AccountChatSnapshot;
  money?: MoneyChatSnapshot;
  screenTime?: ScreenTimeChatSnapshot;
};

const GOAL_OPERATIONS = ['create_goal', 'update_goal', 'delete_goal'] as const;
const ARC_OPERATIONS = ['create_arc', 'update_arc', 'delete_arc'] as const;
const PROFILE_OPERATIONS = ['update_profile'] as const;
const CHAPTER_OPERATIONS = ['update_chapter_note'] as const;
const ACTIVITY_OPERATIONS = [
  'create_activity',
  'update_activity',
  'delete_activity',
  'create_activity_step',
  'update_activity_step',
  'complete_activity_step',
  'delete_activity_step',
  'reorder_activity_steps',
] as const;

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

function arcEvidence(arc: Arc): CapabilityEvidenceSource {
  const identity = arc.identity?.statement ?? null;
  const object: CapabilityObjectRef = {
    type: 'arc', id: arc.id, label: arc.name, secondaryLabel: sentenceCase(arc.status),
  };
  return {
    capabilityId: 'arcs', object,
    searchableText: compact([
      arc.name, arc.narrative, identity, arc.identity?.centralInsight,
      arc.howThisShowsUp?.map((item) => item.text).join(' '),
    ]),
    summary: compact([arc.narrative, identity ? `Identity: ${identity}` : null]),
    authority: 'authoritative', observedAt: arc.updatedAt,
  };
}

export const arcsChatAdapter: CapabilityChatAdapter<ArcsChatSnapshot> = {
  capabilityId: 'arcs',
  context: { dataClassification: 'private_kwilt_data', readOnly: false },
  evidence: { list: ({ arcs }) => arcs.map(arcEvidence) },
  proposal: { operationKinds: ARC_OPERATIONS }, apply: { operationKinds: ARC_OPERATIONS },
  receipt: { reloadAuthoritativeObject: true }, undo: { operationKinds: ARC_OPERATIONS },
  return: {
    targetFor: (object) => ({
      capabilityId: 'arcs', object: { type: object.type, id: object.id }, label: object.label,
      route: {
        name: 'MainTabs',
        params: {
          screen: 'MoreTab',
          params: { screen: 'MoreArcs', params: { screen: 'ArcDetail', params: { arcId: object.id } } },
        },
      },
    }),
  },
};

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

function planRecommendationEvidence(
  recommendation: PlanRecommendationResult['recommendations'][number],
  targetDate: string,
): CapabilityEvidenceSource {
  const placement = recommendation.placement.status === 'placed'
    ? `Proposed ${recommendation.placement.startDate} to ${recommendation.placement.endDate}`
    : `Needs placement: ${sentenceCase(recommendation.placement.reason)}`;
  return {
    capabilityId: 'plan',
    object: {
      type: 'plan_recommendation',
      id: recommendation.activityId,
      label: recommendation.title,
      secondaryLabel: recommendation.goalTitle ?? placement,
    },
    searchableText: compact([
      'plan tomorrow today focus priority recommendation add',
      recommendation.title,
      recommendation.goalTitle,
      targetDate,
      placement,
    ]),
    summary: compact([
      `Priority ${recommendation.priorityPosition + 1}`,
      recommendation.goalTitle ? `Goal: ${recommendation.goalTitle}` : null,
      placement,
    ]),
    authority: 'derived',
    observedAt: null,
  };
}

function planScheduledEvidence(
  item: NonNullable<PlanRecommendationResult['scheduledItems']>[number],
  targetDate: string,
): CapabilityEvidenceSource {
  const timing = item.placement === 'calendar' && item.startDate && item.endDate
    ? `Scheduled ${item.startDate} to ${item.endDate}`
    : `Planned for ${targetDate} without a clock time`;
  return {
    capabilityId: 'plan',
    object: {
      type: 'plan_item', id: item.activityId, label: item.title,
      secondaryLabel: item.goalTitle ?? timing,
    },
    searchableText: compact(['plan scheduled placed official', item.title, item.goalTitle, targetDate, timing]),
    summary: compact([timing, item.goalTitle ? `Goal: ${item.goalTitle}` : null]),
    authority: 'authoritative',
    observedAt: item.startDate,
  };
}

export const goalsChatAdapter: CapabilityChatAdapter<GoalsChatSnapshot> = {
  capabilityId: 'goals',
  context: { dataClassification: 'private_kwilt_data', readOnly: false },
  evidence: { list: ({ goals }) => goals.map(goalEvidence) },
  proposal: { operationKinds: GOAL_OPERATIONS },
  apply: { operationKinds: GOAL_OPERATIONS },
  receipt: { reloadAuthoritativeObject: true },
  undo: { operationKinds: GOAL_OPERATIONS },
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

export const moneyChatAdapter: CapabilityChatAdapter<MoneyChatSnapshot> = {
  capabilityId: 'money',
  context: { dataClassification: 'private_kwilt_data', readOnly: true },
  evidence: {
    list: (snapshot) => snapshot.categories.map((category) => ({
      capabilityId: 'money',
      object: {
        type: 'money_category',
        id: category.id,
        label: category.name,
        secondaryLabel: `${formatMoney(category.spentCents)} spent of ${formatMoney(category.plannedCents)}`,
      },
      searchableText: compact([
        'money budget spending category current month',
        category.name,
        category.description,
      ]),
      summary: compact([
        `Period: ${snapshot.periodLabel}`,
        `Planned: ${formatMoney(category.plannedCents)}`,
        `Spent: ${formatMoney(category.spentCents)}`,
        `Remaining: ${formatMoney(category.remainingCents)}`,
        `Projected: ${formatMoney(category.forecast.projectedSpendCents)}`,
        category.forecast.projectedOverageCents > 0
          ? `Projected over: ${formatMoney(category.forecast.projectedOverageCents)}`
          : `Projected remaining: ${formatMoney(category.forecast.projectedRemainingCents)}`,
        `Forecast confidence: ${category.forecast.confidence}`,
        snapshot.outsidePlan.transactionCount > 0
          ? `Outside plan: ${formatMoney(snapshot.outsidePlan.spentCents)} across ${snapshot.outsidePlan.transactionCount} transactions`
          : null,
        `Transactions: ${category.transactionCount}`,
      ]),
      authority: 'authoritative' as const,
      observedAt: snapshot.lastSyncedAt ?? snapshot.generatedAt,
    })),
  },
  proposal: { operationKinds: [] },
  apply: { operationKinds: [] },
  receipt: { reloadAuthoritativeObject: false },
  undo: { operationKinds: [] },
  return: {
    targetFor: (object) => ({
      capabilityId: 'money',
      object: { type: object.type, id: object.id },
      label: object.label,
      route: {
        name: 'Money',
        params: { screen: 'MoneyCategoryDetail', params: { categoryId: object.id } },
      },
    }),
  },
};

function familyScreenTimeEvidence(
  child: ScreenTimeChatSnapshot['children'][number],
): CapabilityEvidenceSource {
  const { policy } = child;
  const savedLabels = policy.selections.filter((selection) => selection.status === 'active').map((selection) => selection.label);
  const deviceReady = policy.devices.some((device) => (
    device.readiness === 'ready' && device.authorizationStatus === 'authorized'
  ));
  const applied = policy.latestDeviceReceipt?.policyVersion === policy.desiredPolicyVersion
    && policy.latestDeviceReceipt.outcome === 'applied';
  const delivery = !deviceReady ? 'Needs device setup' : applied ? 'Applied' : 'Applying';
  return {
    capabilityId: 'screenTime',
    object: {
      type: 'family_screen_time_child',
      id: child.membershipId,
      label: `${child.displayName}'s Screen Time`,
      secondaryLabel: delivery,
    },
    searchableText: compact([
      'family child screen time app block allow enable disable',
      child.displayName,
      savedLabels.join(' '),
    ]),
    summary: compact([
      `Child: ${child.displayName}`,
      `Saved selections: ${savedLabels.length > 0 ? savedLabels.join(', ') : 'none'}`,
      `Standing agreements: ${policy.agreements.filter((agreement) => agreement.active).length}`,
      `Temporary controls: ${policy.activeOverrides.length}`,
      `Pending requests: ${policy.pendingRequests.length}`,
      `Delivery: ${delivery}`,
      `Desired policy version: ${policy.desiredPolicyVersion}`,
    ]),
    authority: 'authoritative',
    observedAt: policy.latestDeviceReceipt?.occurredAt ?? null,
  };
}

export const screenTimeChatAdapter: CapabilityChatAdapter<ScreenTimeChatSnapshot> = {
  capabilityId: 'screenTime',
  context: { dataClassification: 'private_kwilt_data', readOnly: false },
  evidence: {
    list: ({ children }) => children.filter((child) => child.canManage).map(familyScreenTimeEvidence),
  },
  proposal: { operationKinds: [] },
  apply: { operationKinds: [] },
  receipt: { reloadAuthoritativeObject: true },
  undo: { operationKinds: [] },
  return: {
    targetFor: (object) => ({
      capabilityId: 'screenTime',
      object: { type: object.type, id: object.id },
      label: object.label,
      route: {
        name: 'Settings',
        params: {
          screen: 'SettingsFamilyScreenTime',
          params: { childMembershipId: object.id, childDisplayName: object.label.replace(/'s Screen Time$/, '') },
        },
      },
    }),
  },
};

export type ScreenTimeTargetResolution =
  | {
      status: 'resolved';
      targets: Array<{ childMembershipId: string; selectionId: string; expectedVersion: number }>;
    }
  | {
      status: 'needs_input';
      reason: 'child_not_found' | 'ambiguous_child' | 'ambiguous_selection';
      candidates: string[];
    }
  | {
      status: 'needs_native_selection';
      children: Array<{ childMembershipId: string; displayName: string; suggestedLabel: string }>;
    };

const normalizedScreenTimeLabel = (value: string) => value.trim().toLocaleLowerCase();

export function resolveScreenTimeTargets(
  snapshot: ScreenTimeChatSnapshot,
  input: { childNames: readonly string[]; selectionLabel: string },
): ScreenTimeTargetResolution {
  const manageable = snapshot.children.filter((child) => child.canManage);
  const targets: Array<{ childMembershipId: string; selectionId: string; expectedVersion: number }> = [];
  const nativeSelection: Array<{ childMembershipId: string; displayName: string; suggestedLabel: string }> = [];
  for (const requestedName of input.childNames) {
    const matches = manageable.filter((child) => (
      normalizedScreenTimeLabel(child.displayName) === normalizedScreenTimeLabel(requestedName)
    ));
    if (matches.length === 0) {
      return { status: 'needs_input', reason: 'child_not_found', candidates: manageable.map((child) => child.displayName) };
    }
    if (matches.length > 1) {
      return { status: 'needs_input', reason: 'ambiguous_child', candidates: matches.map((child) => child.displayName) };
    }
    const child = matches[0];
    const selections = child.policy.selections.filter((selection) => (
      selection.status === 'active'
      && normalizedScreenTimeLabel(selection.label) === normalizedScreenTimeLabel(input.selectionLabel)
    ));
    if (selections.length > 1) {
      return { status: 'needs_input', reason: 'ambiguous_selection', candidates: selections.map((selection) => selection.label) };
    }
    if (selections.length === 0) {
      nativeSelection.push({
        childMembershipId: child.membershipId,
        displayName: child.displayName,
        suggestedLabel: input.selectionLabel.trim(),
      });
    } else {
      targets.push({
        childMembershipId: child.membershipId,
        selectionId: selections[0].id,
        expectedVersion: child.policy.desiredPolicyVersion,
      });
    }
  }
  return nativeSelection.length > 0
    ? { status: 'needs_native_selection', children: nativeSelection }
    : { status: 'resolved', targets };
}

export const chaptersChatAdapter: CapabilityChatAdapter<ChaptersChatSnapshot> = {
  capabilityId: 'chapters',
  context: { dataClassification: 'private_kwilt_data', readOnly: false },
  evidence: { list: ({ chapters }) => chapters.map(chapterEvidence) },
  proposal: { operationKinds: CHAPTER_OPERATIONS },
  apply: { operationKinds: CHAPTER_OPERATIONS },
  receipt: { reloadAuthoritativeObject: true },
  undo: { operationKinds: CHAPTER_OPERATIONS },
  return: { targetFor: (object) => nativeReturn('chapters', object) },
};

export const profileChatAdapter: CapabilityChatAdapter<ProfileChatSnapshot> = {
  capabilityId: 'profile',
  context: { dataClassification: 'private_kwilt_data', readOnly: false },
  evidence: {
    list: ({ profile }) => profile ? [{
      capabilityId: 'profile',
      object: {
        type: 'profile', id: profile.id, label: 'Profile',
        secondaryLabel: compact([profile.fullName, profile.ageRange]),
      },
      searchableText: compact([profile.fullName, profile.ageRange]),
      summary: compact([
        profile.fullName ? `Name: ${profile.fullName}` : null,
        profile.ageRange ? `Age range: ${profile.ageRange}` : null,
      ]),
      authority: 'authoritative', observedAt: profile.updatedAt,
    }] : [],
  },
  proposal: { operationKinds: PROFILE_OPERATIONS }, apply: { operationKinds: PROFILE_OPERATIONS },
  receipt: { reloadAuthoritativeObject: true }, undo: { operationKinds: PROFILE_OPERATIONS },
  return: {
    targetFor: (object) => ({
      capabilityId: 'profile', object: { type: object.type, id: object.id }, label: 'Profile',
      route: { name: 'Settings', params: { screen: 'SettingsProfile' } },
    }),
  },
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
    ...(selected.has('arcs') && snapshots.arcs ? arcsChatAdapter.evidence.list(snapshots.arcs) : []),
    ...(selected.has('goals') ? goalsChatAdapter.evidence.list(snapshots.goals) : []),
    ...(selected.has('todos') ? todosChatAdapter.evidence.list(snapshots.todos) : []),
    ...(selected.has('plan') && snapshots.plan
      ? [
          ...(snapshots.plan.scheduledItems ?? []).map((item) =>
            planScheduledEvidence(item, snapshots.plan!.targetDate)),
          ...snapshots.plan.recommendations.map((recommendation) =>
            planRecommendationEvidence(recommendation, snapshots.plan!.targetDate)),
        ]
      : []),
    ...(selected.has('chapters') ? chaptersChatAdapter.evidence.list(snapshots.chapters) : []),
    ...(selected.has('profile') && snapshots.profile ? profileChatAdapter.evidence.list(snapshots.profile) : []),
    ...(selected.has('money') && snapshots.money ? moneyChatAdapter.evidence.list(snapshots.money) : []),
    ...(selected.has('screenTime') && snapshots.screenTime
      ? screenTimeChatAdapter.evidence.list(snapshots.screenTime)
      : []),
    ...(selected.has('account') && snapshots.account ? [{
      capabilityId: 'account' as const,
      object: { type: 'show_up_status', id: 'current', label: 'Show-up status' },
      searchableText: `show up streak ${snapshots.account.showUp.currentShowUpStreak}`,
      summary: compact([
        `Current streak: ${snapshots.account.showUp.currentShowUpStreak}`,
        `Covered streak: ${snapshots.account.showUp.currentCoveredShowUpStreak}`,
        snapshots.account.showUp.lastShowUpDate
          ? `Last show-up: ${snapshots.account.showUp.lastShowUpDate}`
          : 'No recorded show-up date',
        snapshots.account.showUp.eligibleRepairUntilMs
          ? `Repair eligible until: ${new Date(snapshots.account.showUp.eligibleRepairUntilMs).toISOString()}`
          : null,
      ]),
      authority: 'authoritative' as const,
      observedAt: snapshots.account.showUp.observedAt,
    }] : []),
  ];
}

export function resolveUnifiedChatObjectReturn(
  object: CapabilityObjectRef,
): CapabilityNativeReturnTarget | null {
  if (object.type === 'goal') return goalsChatAdapter.return.targetFor(object);
  if (object.type === 'arc') return arcsChatAdapter.return.targetFor(object);
  if (object.type === 'activity') return todosChatAdapter.return.targetFor(object);
  if (object.type === 'chapter') return chaptersChatAdapter.return.targetFor(object);
  if (object.type === 'profile') return profileChatAdapter.return.targetFor(object);
  if (object.type === 'money_category') return moneyChatAdapter.return.targetFor(object);
  if (object.type === 'family_screen_time_child') return screenTimeChatAdapter.return.targetFor(object);
  return null;
}
