import type { Activity, Goal } from '../../domain/types';
import type { ChapterRow } from '../../services/chapters';
import {
  chaptersChatAdapter,
  collectCapabilityEvidence,
  goalsChatAdapter,
  resolveUnifiedChatObjectReturn,
  todosChatAdapter,
} from './capabilityAdapters';

const goal = (overrides: Partial<Goal> = {}): Goal => ({
  id: 'goal-reading',
  arcId: null,
  title: 'Read together every evening',
  description: 'Make calm family time before bed.',
  status: 'in_progress',
  qualityState: 'ready',
  priority: 1,
  targetDate: '2026-08-01',
  forceIntent: {},
  metrics: [{ id: 'metric-1', label: 'Reading nights', target: 20, unit: 'nights' }],
  createdAt: '2026-06-01T12:00:00.000Z',
  updatedAt: '2026-07-21T12:00:00.000Z',
  ...overrides,
});

const activity = (overrides: Partial<Activity> = {}): Activity => ({
  id: 'activity-library',
  goalId: 'goal-reading',
  title: 'Visit the library',
  type: 'task',
  tags: ['errands', 'books'],
  notes: 'Choose rainy-day books.',
  priority: 1,
  scheduledDate: '2026-07-24',
  status: 'planned',
  forceActual: {},
  createdAt: '2026-07-20T12:00:00.000Z',
  updatedAt: '2026-07-21T13:00:00.000Z',
  ...overrides,
});

const chapter = (overrides: Partial<ChapterRow> = {}): ChapterRow => ({
  id: 'chapter-winter',
  user_id: 'user-1',
  template_id: 'template-1',
  period_start: '2026-01-01',
  period_end: '2026-01-07',
  period_key: '2026-W01',
  input_summary: {},
  metrics: {},
  output_json: {
    title: 'A quieter winter',
    sections: [{ key: 'signal', caption: 'Rainy days worked best with books and blanket forts.' }],
  },
  status: 'ready',
  error: null,
  emailed_at: null,
  user_note: 'Keep the library bag ready.',
  user_note_updated_at: '2026-01-08T12:00:00.000Z',
  created_at: '2026-01-07T12:00:00.000Z',
  updated_at: '2026-01-08T12:00:00.000Z',
  ...overrides,
});

describe('Unified Chat capability adapters', () => {
  test('Goals exposes bounded authoritative evidence and an exact native return', () => {
    const sources = goalsChatAdapter.evidence.list({ goals: [goal()] });

    expect(sources).toEqual([
      expect.objectContaining({
        capabilityId: 'goals',
        object: {
          type: 'goal',
          id: 'goal-reading',
          label: 'Read together every evening',
          secondaryLabel: 'In progress · Priority 1 · Target Aug 1, 2026',
        },
        authority: 'authoritative',
        observedAt: '2026-07-21T12:00:00.000Z',
      }),
    ]);
    expect(sources[0].summary).toContain('Reading nights: target 20 nights');
    expect(goalsChatAdapter.return.targetFor(sources[0].object)).toMatchObject({
      capabilityId: 'goals',
      object: { type: 'goal', id: 'goal-reading' },
      route: {
        name: 'MainTabs',
        params: { screen: 'GoalsTab', params: { screen: 'GoalDetail', params: { goalId: 'goal-reading' } } },
      },
    });
  });

  test('To-dos links authoritative evidence to its Goal and owns only typed Activity operations', () => {
    const sources = todosChatAdapter.evidence.list({ activities: [activity()], goals: [goal()] });

    expect(sources[0]).toMatchObject({
      capabilityId: 'todos',
      object: {
        type: 'activity',
        id: 'activity-library',
        label: 'Visit the library',
        secondaryLabel: 'Planned · Read together every evening · Jul 24, 2026',
      },
      authority: 'authoritative',
    });
    expect(sources[0].searchableText).toContain('errands books');
    expect(todosChatAdapter.proposal.operationKinds).toEqual(['create_activity', 'update_activity']);
    expect(todosChatAdapter.apply.operationKinds).toEqual(['create_activity', 'update_activity']);
    expect(todosChatAdapter.undo.operationKinds).toEqual(['create_activity', 'update_activity']);
    expect(todosChatAdapter.receipt.reloadAuthoritativeObject).toBe(true);
  });

  test('Chapters supplies derived retrospective evidence but remains read-only', () => {
    const sources = chaptersChatAdapter.evidence.list({ chapters: [chapter()] });

    expect(sources[0]).toMatchObject({
      capabilityId: 'chapters',
      object: {
        type: 'chapter',
        id: 'chapter-winter',
        label: 'A quieter winter',
        secondaryLabel: 'Jan 1–7, 2026',
      },
      authority: 'derived',
      observedAt: '2026-01-08T12:00:00.000Z',
    });
    expect(sources[0].summary).toContain('Rainy days worked best');
    expect(chaptersChatAdapter.proposal.operationKinds).toEqual([]);
    expect(chaptersChatAdapter.apply.operationKinds).toEqual([]);
    expect(chaptersChatAdapter.undo.operationKinds).toEqual([]);
    expect(chaptersChatAdapter.return.targetFor(sources[0].object)).toMatchObject({
      route: {
        params: { screen: 'MoreTab', params: { screen: 'MoreChapterDetail', params: { chapterId: 'chapter-winter' } } },
      },
    });
  });

  test('collects only participating capabilities and never introduces Arcs', () => {
    const sources = collectCapabilityEvidence({
      participatingCapabilities: ['todos', 'chapters'],
      snapshots: {
        goals: { goals: [goal()] },
        todos: { activities: [activity()], goals: [goal()] },
        chapters: { chapters: [chapter()] },
      },
    });

    expect(sources.map((source) => source.capabilityId)).toEqual(['todos', 'chapters']);
    expect(sources.some((source) => source.object.type === 'arc')).toBe(false);
  });

  test('resolves only capability-owned objects to exact native destinations', () => {
    expect(resolveUnifiedChatObjectReturn({ type: 'activity', id: 'activity-library', label: 'Visit the library' })).toMatchObject({
      route: { params: { screen: 'ActivitiesTab', params: { screen: 'ActivityDetail', params: { activityId: 'activity-library' } } } },
    });
    expect(resolveUnifiedChatObjectReturn({ type: 'arc', id: 'arc-1', label: 'Family' })).toBeNull();
  });
});
