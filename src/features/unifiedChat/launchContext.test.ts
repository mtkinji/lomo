import type { Activity, Goal } from '../../domain/types';
import type { ChapterRow } from '../../services/chapters';
import { recipeContractFixture, recipeVersionContractFixture } from '../../capabilities/recipes/domain/recipeContractFixtures';
import { buildUnifiedChatAttachableContexts, resolveUnifiedChatLaunchAttachment } from './launchContext';

const goal = {
  id: 'goal-1', title: 'Read together', status: 'in_progress', arcId: null, metrics: [], forceIntent: {},
  createdAt: '2026-07-20T12:00:00.000Z', updatedAt: '2026-07-22T12:00:00.000Z',
} as Goal;
const activity = {
  id: 'activity-1', title: 'Visit the library', status: 'planned', goalId: 'goal-1', tags: [], type: 'task',
  forceActual: {}, createdAt: '2026-07-20T12:00:00.000Z', updatedAt: '2026-07-22T12:00:00.000Z',
} as Activity;
const chapter = {
  id: 'chapter-1', output_json: { title: 'A steadier week' }, period_key: '2026-W29',
  period_start: '2026-07-13', period_end: '2026-07-19', user_note: null,
  user_note_updated_at: null, updated_at: '2026-07-20T12:00:00.000Z',
} as ChapterRow;

const recipe = {
  recipe: recipeContractFixture(),
  currentVersion: recipeVersionContractFixture(),
};
const snapshots = { goals: [goal], activities: [activity], chapters: [chapter], recipes: [recipe] };
const returnTarget = { name: 'MainTabs', params: { screen: 'GoalsTab' } };

describe('resolveUnifiedChatLaunchAttachment', () => {
  test('projects inventory context without loading private objects', () => {
    expect(resolveUnifiedChatLaunchAttachment({
      capabilityId: 'goals', surface: 'inventory', returnTarget,
    }, { goals: [], activities: [], chapters: [] })).toEqual({
      capabilityId: 'goals', objectType: 'capability', objectId: 'goals',
      label: 'Goals', secondaryLabel: 'Current capability', returnTarget,
    });
  });

  test('projects Meals inventory context for the shared drawer', () => {
    expect(resolveUnifiedChatLaunchAttachment({
      capabilityId: 'meal_planning', surface: 'inventory', returnTarget: { name: 'Food' },
    }, { goals: [], activities: [], chapters: [] })).toMatchObject({
      capabilityId: 'meal_planning', objectType: 'capability', label: 'Meals',
    });
  });

  test('projects the selected Plan day without loading a private object', () => {
    const planReturnTarget = {
      name: 'MainTabs',
      params: { screen: 'PlanTab', params: { dateKey: '2026-08-17' } },
    };

    expect(resolveUnifiedChatLaunchAttachment({
      capabilityId: 'plan',
      surface: 'detail',
      object: { type: 'day', id: '2026-08-17' },
      returnTarget: planReturnTarget,
    }, { goals: [], activities: [], chapters: [] })).toEqual({
      capabilityId: 'plan',
      objectType: 'day',
      objectId: '2026-08-17',
      label: 'Mon, Aug 17',
      secondaryLabel: 'Plan day',
      returnTarget: planReturnTarget,
    });
  });

  test.each([
    ['goals', { type: 'goal', id: 'goal-1' }, 'Read together'],
    ['todos', { type: 'activity', id: 'activity-1' }, 'Visit the library'],
    ['chapters', { type: 'chapter', id: 'chapter-1' }, 'A steadier week'],
  ] as const)('projects an existing %s detail object as visible context', (capabilityId, object, label) => {
    expect(resolveUnifiedChatLaunchAttachment({
      capabilityId, surface: 'detail', object, returnTarget,
    }, snapshots)).toMatchObject({ capabilityId, objectType: object.type, objectId: object.id, label });
  });

  test('refuses to attach a stale detail route whose object no longer exists', () => {
    expect(resolveUnifiedChatLaunchAttachment({
      capabilityId: 'goals', surface: 'detail', object: { type: 'goal', id: 'missing' }, returnTarget,
    }, snapshots)).toBeNull();
  });

  test('projects the exact Recipe detail as visible context', () => {
    expect(resolveUnifiedChatLaunchAttachment({
      capabilityId: 'recipes',
      surface: 'detail',
      object: { type: 'recipe', id: recipe.recipe.id },
      returnTarget: { name: 'Food', params: { screen: 'RecipeHome' } },
    }, snapshots)).toMatchObject({
      capabilityId: 'recipes',
      objectType: 'recipe',
      objectId: recipe.recipe.id,
      label: recipe.currentVersion.title,
    });
  });
});

test('builds native add-context choices with exact return targets', () => {
  expect(buildUnifiedChatAttachableContexts(snapshots)).toEqual(expect.arrayContaining([
    expect.objectContaining({ capabilityId: 'goals', objectId: 'goal-1', label: 'Read together', returnTarget: expect.objectContaining({ name: 'MainTabs' }) }),
    expect.objectContaining({ capabilityId: 'todos', objectId: 'activity-1', label: 'Visit the library' }),
    expect.objectContaining({ capabilityId: 'chapters', objectId: 'chapter-1', label: 'A steadier week' }),
  ]));
});
