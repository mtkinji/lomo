import type { ActivityAiEnrichment } from '../../../services/ai';
import { localDateKey } from '../../../domain/activityRecurrence';
import type {
  ActivityRepeatBasis,
  ActivityRepeatCustom,
  ActivityRepeatRule,
} from '../../../domain/types';
import type {
  ChoreLearningRecord,
  ChoreMember,
  ChorePhotoPolicy,
  ChoreReviewPolicy,
  ChoreSeries,
} from './choreLearning';

export type ChoreDraft = {
  title: string;
  assignedMemberId: string | null;
  repeatRule?: ActivityRepeatRule;
  repeatCustom?: ActivityRepeatCustom;
  repeatBasis: ActivityRepeatBasis;
  definitionOfDone: string;
  photoPolicy: ChorePhotoPolicy;
  reviewPolicy: ChoreReviewPolicy;
  tokenValue: 1 | 2 | 3;
};

export type ChoreDraftField = keyof ChoreDraft;

function includesExactName(source: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^\\p{L}])${escaped}(?:$|[^\\p{L}])`, 'iu').test(source);
}

export function createChoreDraft(sourceText: string, members: ChoreMember[]): ChoreDraft {
  const matchingChildren = members.filter((member) => (
    member.role === 'child' && includesExactName(sourceText, member.displayName)
  ));
  return {
    title: sourceText.trim(),
    assignedMemberId: matchingChildren.length === 1 ? matchingChildren[0].id : null,
    repeatRule: undefined,
    repeatCustom: undefined,
    repeatBasis: 'scheduled',
    definitionOfDone: '',
    photoPolicy: 'optional',
    reviewPolicy: 'trusted',
    tokenValue: 1,
  };
}

export function createChoreDraftFromSeries(series: ChoreSeries): ChoreDraft {
  return {
    title: series.title,
    assignedMemberId: series.assignedMemberId,
    repeatRule: series.repeatRule,
    repeatCustom: series.repeatCustom ? { ...series.repeatCustom } : undefined,
    repeatBasis: series.repeatBasis ?? 'scheduled',
    definitionOfDone: series.definitionOfDone,
    photoPolicy: series.photoPolicy,
    reviewPolicy: series.reviewPolicy,
    tokenValue: series.tokenValue,
  };
}

function mapRepeatRule(repeatRule: ActivityAiEnrichment['repeatRule']): ActivityRepeatRule | null {
  if (repeatRule === 'daily' || repeatRule === 'weekdays' || repeatRule === 'weekly'
    || repeatRule === 'monthly' || repeatRule === 'yearly') {
    return repeatRule;
  }
  return null;
}

function explicitlyRequestsRecurrence(title: string): boolean {
  return /\b(every|daily|each day|weekdays?|weekly|each week|once a week|monthly|each month|yearly|annually)\b/i.test(title);
}

export function applyChoreDraftEnrichment(
  draft: ChoreDraft,
  enrichment: ActivityAiEnrichment | null,
  touchedFields: ReadonlySet<ChoreDraftField>,
): ChoreDraft {
  if (!enrichment) return draft;
  const next = { ...draft };
  if (!touchedFields.has('definitionOfDone')) {
    const steps = enrichment.steps
      ?.map((step) => step.title.trim())
      .filter(Boolean)
      .slice(0, 4)
      .join('\n');
    const definition = steps || enrichment.notes?.trim();
    if (definition) next.definitionOfDone = definition;
  }
  if (!touchedFields.has('repeatRule') && explicitlyRequestsRecurrence(draft.title)) {
    const repeatRule = mapRepeatRule(enrichment.repeatRule);
    if (repeatRule) {
      next.repeatRule = repeatRule;
      next.repeatCustom = undefined;
    }
  }
  return next;
}

export function addChoreDraftToLearningRecord(
  record: ChoreLearningRecord,
  draft: ChoreDraft,
  caregiverId: string,
  createdAtIso: string,
  idSeed: string,
): ChoreLearningRecord {
  const caregiver = record.members.find((member) => (
    member.id === caregiverId && member.role === 'caregiver'
  ));
  const title = draft.title.trim();
  if (!caregiver || !title) return record;

  const assignedMember = draft.assignedMemberId == null
    ? null
    : record.members.find((member) => (
      member.id === draft.assignedMemberId && member.role === 'child'
    ));
  const participation = assignedMember ? 'assigned' : 'open';
  const normalizedSeed = idSeed.trim().replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '')
    || createdAtIso.replace(/[^0-9]/g, '');

  return {
    ...record,
    series: [
      ...record.series,
      {
        activitySeriesId: `activity-series-${normalizedSeed}`,
        title,
        definitionOfDone: draft.definitionOfDone.trim(),
        repeatRule: draft.repeatRule,
        repeatCustom: draft.repeatCustom ? { ...draft.repeatCustom } : undefined,
        repeatBasis: draft.repeatRule ? draft.repeatBasis : undefined,
        tokenValue: draft.tokenValue,
        photoPolicy: draft.photoPolicy,
        reviewPolicy: draft.reviewPolicy,
        participation,
        assignedMemberId: assignedMember?.id ?? null,
      },
    ],
    occurrences: [
      ...record.occurrences,
      {
        activityOccurrenceId: `activity-occurrence-${normalizedSeed}`,
        activitySeriesId: `activity-series-${normalizedSeed}`,
        title,
        definitionOfDone: draft.definitionOfDone.trim(),
        scheduledDate: draft.repeatRule ? localDateKey(new Date(createdAtIso)) : null,
        repeatRule: draft.repeatRule,
        repeatCustom: draft.repeatCustom ? { ...draft.repeatCustom } : undefined,
        repeatBasis: draft.repeatRule ? draft.repeatBasis : undefined,
        repeatCreatedFromOccurrenceId: null,
        tokenValue: draft.tokenValue,
        photoPolicy: draft.photoPolicy,
        reviewPolicy: draft.reviewPolicy,
        participation,
        assignedMemberId: assignedMember?.id ?? null,
        state: participation === 'assigned' ? 'ready' : 'available',
        claimedByMemberId: null,
        performedByMemberId: null,
        performedAtIso: null,
        reviewedByMemberId: null,
        reviewedAtIso: null,
        reviewNote: null,
        evidencePhotoUri: null,
      },
    ],
  };
}

export function updateChoreSeriesInLearningRecord(
  record: ChoreLearningRecord,
  draft: ChoreDraft,
  caregiverId: string,
  activitySeriesId: string,
): ChoreLearningRecord {
  const caregiver = record.members.find((member) => (
    member.id === caregiverId && member.role === 'caregiver'
  ));
  const seriesIndex = record.series.findIndex((series) => series.activitySeriesId === activitySeriesId);
  const title = draft.title.trim();
  if (!caregiver || seriesIndex < 0 || !title) return record;

  const assignedMember = draft.assignedMemberId == null
    ? null
    : record.members.find((member) => (
      member.id === draft.assignedMemberId && member.role === 'child'
    ));
  const series = [...record.series];
  series[seriesIndex] = {
    activitySeriesId,
    title,
    definitionOfDone: draft.definitionOfDone.trim(),
    repeatRule: draft.repeatRule,
    repeatCustom: draft.repeatCustom ? { ...draft.repeatCustom } : undefined,
    repeatBasis: draft.repeatRule ? draft.repeatBasis : undefined,
    tokenValue: draft.tokenValue,
    photoPolicy: draft.photoPolicy,
    reviewPolicy: draft.reviewPolicy,
    participation: assignedMember ? 'assigned' : 'open',
    assignedMemberId: assignedMember?.id ?? null,
  };
  return { ...record, series };
}
