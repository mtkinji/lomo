import type { Activity, Arc, Goal } from '../../domain/types';
import { generateArcBannerVibeQuery } from '../../services/ai';
import { buildVisualSearchFallbackQuery } from '../../services/arcBannerImageSearchTerms';
import {
  searchUnsplashPhotos,
  trackUnsplashDownload,
  type UnsplashPhoto,
  withUnsplashReferral,
} from '../../services/unsplash';

export type ActivityCoverImageSelection = Pick<Activity, 'thumbnailUrl' | 'heroImageMeta'>;

type FindActivityCoverImageParams = {
  title: string;
  goalId: string | null;
  activityType?: string;
  existingTags?: string[];
  goals: Goal[];
  arcs: Arc[];
  canUseUnsplash: boolean;
};

type ActivityCoverImageDeps = {
  generateQuery?: typeof generateArcBannerVibeQuery;
  searchPhotos?: typeof searchUnsplashPhotos;
  trackDownload?: typeof trackUnsplashDownload;
};

function compactQuery(value: string): string {
  return value
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 5)
    .join(' ');
}

export function buildActivityCoverFallbackQuery(params: {
  title: string;
  existingTags?: string[];
}): string {
  return buildVisualSearchFallbackQuery({
    objectKind: 'activity',
    name: params.title,
    relatedTitles: params.existingTags,
  }) ?? compactQuery([params.title, ...(params.existingTags ?? [])].join(' '));
}

function toActivityCoverImageSelection(
  photo: UnsplashPhoto,
  query: string,
): ActivityCoverImageSelection {
  return {
    thumbnailUrl: photo.urls.regular,
    heroImageMeta: {
      source: 'unsplash',
      prompt: query,
      createdAt: new Date().toISOString(),
      unsplashPhotoId: photo.id,
      unsplashAuthorName: photo.user.name,
      unsplashAuthorLink: withUnsplashReferral(photo.user.links.html),
      unsplashLink: withUnsplashReferral(photo.links.html),
    },
  };
}

export async function findActivityCoverImageWithAI(
  params: FindActivityCoverImageParams,
  deps: ActivityCoverImageDeps = {},
): Promise<ActivityCoverImageSelection | null> {
  if (!params.canUseUnsplash) return null;

  const targetGoal = params.goalId
    ? params.goals.find((candidate) => candidate.id === params.goalId) ?? null
    : null;
  const targetArc = targetGoal?.arcId
    ? params.arcs.find((candidate) => candidate.id === targetGoal.arcId) ?? null
    : null;
  const generateQuery = deps.generateQuery ?? generateArcBannerVibeQuery;
  const searchPhotos = deps.searchPhotos ?? searchUnsplashPhotos;
  const trackDownload = deps.trackDownload ?? trackUnsplashDownload;
  const fallbackQuery = buildActivityCoverFallbackQuery({
    title: params.title,
    existingTags: params.existingTags,
  });

  const vibeQuery =
    (await generateQuery({
      objectKind: 'activity',
      arcName: params.title,
      arcNarrative: targetGoal?.description ?? targetArc?.narrative,
      goalTitles: [
        targetGoal?.title,
        params.activityType ? `${params.activityType} to-do` : null,
        ...(params.existingTags ?? []),
      ].filter(Boolean) as string[],
    }).catch(() => null)) ?? null;

  const queries = Array.from(
    new Set(
      [vibeQuery, fallbackQuery, compactQuery(params.title)]
        .map((query) => (query ?? '').trim())
        .filter(Boolean),
    ),
  );

  for (const query of queries) {
    const photos = await searchPhotos(query, {
      perPage: 12,
      page: 1,
      orientation: 'landscape',
    }).catch(() => []);
    const photo = photos[0];
    if (!photo) continue;

    trackDownload(photo.id).catch(() => undefined);
    return toActivityCoverImageSelection(photo, query);
  }

  return null;
}
