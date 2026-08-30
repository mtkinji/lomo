export type ChapterAlignmentActivity = {
  id: string;
  title: string;
  goalId: string | null;
  updatedAt: string;
};

export type ChapterAlignmentGoal = { id: string; title: string };

export type ChapterAlignmentSource = {
  id: string;
  updatedAt: string;
  output: unknown;
};

export type ChapterAlignmentPreview = {
  chapterId: string;
  recommendationId: string;
  expectedUpdatedAt: string;
  goal: ChapterAlignmentGoal;
  arc: { id: string | null; title: string | null };
  reason: string;
  activities: Array<{ id: string; title: string; expectedUpdatedAt: string }>;
};

export type ApplyChapterAlignmentInput = {
  chapterId: string;
  recommendationId: string;
  expectedUpdatedAt: string;
  activities: Array<{ activityId: string; expectedUpdatedAt: string }>;
};

type AlignRecommendation = {
  id: string;
  kind: 'align';
  reason: string;
  payload: {
    goalId: string;
    goalTitle: string;
    arcId: string | null;
    arcTitle: string | null;
    activityIds: string[];
  };
};

export class ChapterAlignmentConflictError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseAlignRecommendation(value: unknown): AlignRecommendation | null {
  if (!isRecord(value) || value.kind !== 'align' || typeof value.id !== 'string' || !isRecord(value.payload)) return null;
  const payload = value.payload;
  if (typeof payload.goalId !== 'string' || !Array.isArray(payload.activityIds)
    || !payload.activityIds.every((id) => typeof id === 'string')) return null;
  return {
    id: value.id,
    kind: 'align',
    reason: typeof value.reason === 'string' ? value.reason : '',
    payload: {
      goalId: payload.goalId,
      goalTitle: typeof payload.goalTitle === 'string' ? payload.goalTitle : '',
      arcId: typeof payload.arcId === 'string' ? payload.arcId : null,
      arcTitle: typeof payload.arcTitle === 'string' ? payload.arcTitle : null,
      activityIds: payload.activityIds,
    },
  };
}

function recommendationsFrom(output: unknown): AlignRecommendation[] {
  if (!isRecord(output) || !Array.isArray(output.recommendations)) return [];
  return output.recommendations.map(parseAlignRecommendation).filter((value): value is AlignRecommendation => !!value);
}

export function previewChapterAlignments({ chapter, goals, activities }: {
  chapter: ChapterAlignmentSource;
  goals: readonly ChapterAlignmentGoal[];
  activities: readonly ChapterAlignmentActivity[];
}): ChapterAlignmentPreview[] {
  const activityById = new Map(activities.map((activity) => [activity.id, activity]));
  const goalById = new Map(goals.map((goal) => [goal.id, goal]));
  return recommendationsFrom(chapter.output).flatMap((recommendation) => {
    const goal = goalById.get(recommendation.payload.goalId);
    if (!goal) return [];
    const candidates = recommendation.payload.activityIds.flatMap((id) => {
      const activity = activityById.get(id);
      if (!activity || (activity.goalId && activity.goalId !== goal.id)) return [];
      return [{ id: activity.id, title: activity.title, expectedUpdatedAt: activity.updatedAt }];
    });
    if (candidates.length === 0) return [];
    return [{
      chapterId: chapter.id,
      recommendationId: recommendation.id,
      expectedUpdatedAt: chapter.updatedAt,
      goal,
      arc: { id: recommendation.payload.arcId, title: recommendation.payload.arcTitle },
      reason: recommendation.reason,
      activities: candidates,
    }];
  });
}

export async function applyChapterAlignment({ chapter, goals, activities, input, updateActivityGoal }: {
  chapter: ChapterAlignmentSource;
  goals: readonly ChapterAlignmentGoal[];
  activities: readonly ChapterAlignmentActivity[];
  input: ApplyChapterAlignmentInput;
  updateActivityGoal: (activityId: string, goalId: string) => Promise<void> | void;
}): Promise<{ goalId: string; activityIds: string[] }> {
  if (input.chapterId !== chapter.id || input.expectedUpdatedAt !== chapter.updatedAt || input.activities.length === 0) {
    throw new ChapterAlignmentConflictError('The Chapter recommendation changed after review.');
  }
  const preview = previewChapterAlignments({ chapter, goals, activities })
    .find((candidate) => candidate.recommendationId === input.recommendationId);
  if (!preview) throw new ChapterAlignmentConflictError('The Chapter alignment is no longer available.');

  const reviewedById = new Map(preview.activities.map((activity) => [activity.id, activity]));
  const uniqueIds = new Set(input.activities.map((activity) => activity.activityId));
  if (uniqueIds.size !== input.activities.length) {
    throw new ChapterAlignmentConflictError('The reviewed To-do list contains duplicates.');
  }
  for (const requested of input.activities) {
    const reviewed = reviewedById.get(requested.activityId);
    if (!reviewed || reviewed.expectedUpdatedAt !== requested.expectedUpdatedAt) {
      throw new ChapterAlignmentConflictError('A reviewed To-do changed after this alignment was prepared.');
    }
  }
  for (const requested of input.activities) {
    await updateActivityGoal(requested.activityId, preview.goal.id);
  }
  return { goalId: preview.goal.id, activityIds: input.activities.map((activity) => activity.activityId) };
}
