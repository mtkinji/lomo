import {
  ChapterAlignmentConflictError,
  applyChapterAlignment,
  previewChapterAlignments,
} from './chapterAlignmentActions';

const chapter = {
  id: 'chapter-1',
  updatedAt: '2026-08-28T10:00:00.000Z',
  output: {
    recommendations: [{
      id: 'align-1',
      kind: 'align',
      payload: {
        goalId: 'goal-1', goalTitle: 'Prepare the launch', arcId: 'arc-1', arcTitle: 'Kwilt',
        activityIds: ['activity-1', 'activity-2'],
      },
      reason: 'These To-dos support the launch.',
    }],
  },
};

const goals = [{ id: 'goal-1', title: 'Prepare the launch' }];
const activities = [
  { id: 'activity-1', title: 'Polish onboarding', goalId: null, updatedAt: 'activity-v1' },
  { id: 'activity-2', title: 'Review launch copy', goalId: null, updatedAt: 'activity-v2' },
];

test('previews the exact available To-dos and their current versions', () => {
  expect(previewChapterAlignments({ chapter, goals, activities })).toEqual([{
    chapterId: 'chapter-1',
    recommendationId: 'align-1',
    expectedUpdatedAt: '2026-08-28T10:00:00.000Z',
    goal: { id: 'goal-1', title: 'Prepare the launch' },
    arc: { id: 'arc-1', title: 'Kwilt' },
    reason: 'These To-dos support the launch.',
    activities: [
      { id: 'activity-1', title: 'Polish onboarding', expectedUpdatedAt: 'activity-v1' },
      { id: 'activity-2', title: 'Review launch copy', expectedUpdatedAt: 'activity-v2' },
    ],
  }]);
});

test('applies only a reviewed subset through the shared update boundary', async () => {
  const updates: Array<{ id: string; goalId: string }> = [];
  const result = await applyChapterAlignment({
    chapter,
    goals,
    activities,
    input: {
      chapterId: chapter.id,
      recommendationId: 'align-1',
      expectedUpdatedAt: chapter.updatedAt,
      activities: [{ activityId: 'activity-2', expectedUpdatedAt: 'activity-v2' }],
    },
    updateActivityGoal: async (id, goalId) => { updates.push({ id, goalId }); },
  });

  expect(updates).toEqual([{ id: 'activity-2', goalId: 'goal-1' }]);
  expect(result).toEqual({ goalId: 'goal-1', activityIds: ['activity-2'] });
});

test('rejects a stale To-do instead of overwriting a newer choice', async () => {
  await expect(applyChapterAlignment({
    chapter,
    goals,
    activities: [{ ...activities[0], goalId: 'goal-elsewhere', updatedAt: 'activity-new' }, activities[1]],
    input: {
      chapterId: chapter.id,
      recommendationId: 'align-1',
      expectedUpdatedAt: chapter.updatedAt,
      activities: [{ activityId: 'activity-1', expectedUpdatedAt: 'activity-v1' }],
    },
    updateActivityGoal: async () => undefined,
  })).rejects.toBeInstanceOf(ChapterAlignmentConflictError);
});

test('rejects activity ids that were not in the reviewed recommendation', async () => {
  await expect(applyChapterAlignment({
    chapter,
    goals,
    activities: [...activities, { id: 'activity-3', title: 'Unrelated', goalId: null, updatedAt: 'v3' }],
    input: {
      chapterId: chapter.id,
      recommendationId: 'align-1',
      expectedUpdatedAt: chapter.updatedAt,
      activities: [{ activityId: 'activity-3', expectedUpdatedAt: 'v3' }],
    },
    updateActivityGoal: async () => undefined,
  })).rejects.toBeInstanceOf(ChapterAlignmentConflictError);
});
