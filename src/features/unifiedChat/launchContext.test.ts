import type { Activity, Goal } from '../../domain/types';
import type { ChapterRow } from '../../services/chapters';
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

const snapshots = { goals: [goal], activities: [activity], chapters: [chapter] };
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
});

test('builds native add-context choices with exact return targets', () => {
  expect(buildUnifiedChatAttachableContexts(snapshots)).toEqual(expect.arrayContaining([
    expect.objectContaining({ capabilityId: 'goals', objectId: 'goal-1', label: 'Read together', returnTarget: expect.objectContaining({ name: 'MainTabs' }) }),
    expect.objectContaining({ capabilityId: 'todos', objectId: 'activity-1', label: 'Visit the library' }),
    expect.objectContaining({ capabilityId: 'chapters', objectId: 'chapter-1', label: 'A steadier week' }),
  ]));
});
