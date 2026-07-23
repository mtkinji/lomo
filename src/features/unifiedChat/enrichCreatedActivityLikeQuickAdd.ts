import type { Activity, Arc, Goal } from '../../domain/types';
import { enrichActivityWithAI } from '../../services/ai';
import { findActivityCoverImageWithAI } from '../activities/activityCoverImage';
import {
  applyQuickAddAiEnrichment,
  resolveQuickAddLocationTriggerEnrichment,
  type QuickAddAiAction,
} from '../activities/useQuickAddDockController';

export function resolveChatQuickAddAiActions(canUseCoverImage: boolean): QuickAddAiAction[] {
  return ['steps', 'triggers', 'details', ...(canUseCoverImage ? ['cover_image' as const] : [])];
}

type Dependencies = {
  enrich?: typeof enrichActivityWithAI;
  findCover?: typeof findActivityCoverImageWithAI;
  now?: () => string;
};

export async function enrichCreatedActivityLikeQuickAdd({
  activity,
  goals,
  arcs,
  canUseCoverImage,
  dependencies = {},
}: {
  activity: Activity;
  goals: Goal[];
  arcs: Arc[];
  canUseCoverImage: boolean;
  locationTriggersEnabled: boolean;
  dependencies?: Dependencies;
}): Promise<Activity> {
  const selectedActions = resolveChatQuickAddAiActions(canUseCoverImage);
  const enrichmentActions = selectedActions.filter(
    (action): action is Exclude<QuickAddAiAction, 'cover_image'> => action !== 'cover_image',
  );
  const enrich = dependencies.enrich ?? enrichActivityWithAI;
  const findCover = dependencies.findCover ?? findActivityCoverImageWithAI;

  const [enrichmentResult, coverResult] = await Promise.allSettled([
    enrich({
      activityId: activity.id,
      title: activity.title,
      goalId: activity.goalId,
      activityType: activity.type,
      existingNotes: activity.notes,
      existingTags: activity.tags,
      selectedActions: enrichmentActions,
    }),
    canUseCoverImage
      ? findCover({
          title: activity.title,
          goalId: activity.goalId,
          activityType: activity.type,
          existingTags: activity.tags,
          goals,
          arcs,
          canUseUnsplash: true,
        })
      : Promise.resolve(null),
  ]);

  const rawEnrichment = enrichmentResult.status === 'fulfilled' ? enrichmentResult.value ?? {} : {};
  const locationResolution = resolveQuickAddLocationTriggerEnrichment({
    enrichment: rawEnrichment,
  });
  const timestamp = dependencies.now?.() ?? new Date().toISOString();
  const goalContext = activity.goalId
    ? goals.find((candidate) => candidate.id === activity.goalId) ?? null
    : null;
  const enriched = applyQuickAddAiEnrichment(activity, locationResolution.enrichment, {
    activityId: activity.id,
    selectedActions,
    timestamp,
    goalContext,
  });
  const cover = coverResult.status === 'fulfilled' ? coverResult.value : null;
  if (!cover?.thumbnailUrl && !cover?.heroImageMeta) return enriched;
  return {
    ...enriched,
    thumbnailUrl: cover.thumbnailUrl,
    heroImageMeta: cover.heroImageMeta,
    updatedAt: timestamp,
  };
}
