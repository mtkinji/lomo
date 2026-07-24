import type { Activity, Arc, Goal } from '../../domain/types';
import type { ChapterRow } from '../../services/chapters';
import {
  chaptersChatAdapter,
  collectCapabilityEvidence,
  arcsChatAdapter,
  goalsChatAdapter,
  profileChatAdapter,
  resolveUnifiedChatObjectReturn,
  todosChatAdapter,
} from './capabilityAdapters';

const arc: Arc = {
  id: 'arc-parent', name: 'Steady parent', narrative: 'I make transitions feel safe.',
  identity: { statement: 'I am a steady parent.', centralInsight: 'Calm preparation creates trust.' },
  status: 'active', createdAt: '2026-06-01T12:00:00.000Z', updatedAt: '2026-07-20T12:00:00.000Z',
};

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
  test('Account exposes bounded authoritative show-up status as evidence', () => {
    const sources = collectCapabilityEvidence({
      participatingCapabilities: ['account'],
      snapshots: {
        goals: { goals: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
        account: { showUp: {
          lastShowUpDate: '2026-07-23', currentShowUpStreak: 6, currentCoveredShowUpStreak: 7,
          eligibleRepairUntilMs: null, observedAt: '2026-07-23T12:00:00.000Z',
        } },
      },
    });
    expect(sources).toEqual([expect.objectContaining({
      capabilityId: 'account', object: { type: 'show_up_status', id: 'current', label: 'Show-up status' },
      authority: 'authoritative', observedAt: '2026-07-23T12:00:00.000Z',
      summary: expect.stringContaining('Current streak: 6'),
    })]);
  });

  test('Arcs exposes bounded identity evidence and an exact native return', () => {
    const sources = arcsChatAdapter.evidence.list({ arcs: [arc] });
    expect(sources[0]).toMatchObject({
      capabilityId: 'arcs', object: { type: 'arc', id: arc.id, label: arc.name },
      authority: 'authoritative', observedAt: arc.updatedAt,
    });
    expect(sources[0].summary).toContain('I am a steady parent.');
    expect(resolveUnifiedChatObjectReturn(sources[0].object)).toMatchObject({
      capabilityId: 'arcs',
      route: {
        params: {
          screen: 'MoreTab',
          params: { screen: 'MoreArcs', params: { screen: 'ArcDetail', params: { arcId: arc.id } } },
        },
      },
    });
  });

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
    expect(todosChatAdapter.proposal.operationKinds).toEqual([
      'create_activity', 'update_activity', 'delete_activity', 'create_activity_step', 'update_activity_step',
      'complete_activity_step', 'delete_activity_step', 'reorder_activity_steps',
    ]);
    expect(todosChatAdapter.apply.operationKinds).toEqual(todosChatAdapter.proposal.operationKinds);
    expect(todosChatAdapter.undo.operationKinds).toEqual(todosChatAdapter.proposal.operationKinds);
    expect(todosChatAdapter.receipt.reloadAuthoritativeObject).toBe(true);
  });

  test('Chapters supplies derived retrospective evidence and owns only note updates', () => {
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
    expect(chaptersChatAdapter.proposal.operationKinds).toEqual(['update_chapter_note']);
    expect(chaptersChatAdapter.apply.operationKinds).toEqual(['update_chapter_note']);
    expect(chaptersChatAdapter.undo.operationKinds).toEqual(['update_chapter_note']);
    expect(chaptersChatAdapter.return.targetFor(sources[0].object)).toMatchObject({
      route: {
        params: { screen: 'MoreTab', params: { screen: 'MoreChapterDetail', params: { chapterId: 'chapter-winter' } } },
      },
    });
  });

  test('Profile exposes only bounded coaching fields and returns to native settings', () => {
    const sources = profileChatAdapter.evidence.list({
      profile: {
        id: 'profile-1', fullName: 'Andrew', email: 'private@example.com', ageRange: '35-44',
        createdAt: 'before', updatedAt: 'current', communication: {}, visuals: {},
      },
    });
    expect(sources).toEqual([expect.objectContaining({
      capabilityId: 'profile', searchableText: 'Andrew · 35-44',
      summary: 'Name: Andrew · Age range: 35-44',
    })]);
    expect(sources[0].searchableText).not.toContain('private@example.com');
    expect(profileChatAdapter.proposal.operationKinds).toEqual(['update_profile']);
    expect(profileChatAdapter.return.targetFor(sources[0].object)).toMatchObject({
      route: { name: 'Settings', params: { screen: 'SettingsProfile' } },
    });
  });

  test('collects only participating capabilities', () => {
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

  test('projects Plan recommendations as derived evidence with placement truth', () => {
    const sources = collectCapabilityEvidence({
      participatingCapabilities: ['plan'],
      snapshots: {
        goals: { goals: [] },
        todos: { activities: [], goals: [] },
        chapters: { chapters: [] },
        plan: {
          targetDate: '2026-07-23T18:00:00.000Z',
          writeCalendarRef: null,
          limitation: 'no_write_calendar',
          recommendations: [{
            activityId: 'activity-library', title: 'Visit the library',
            expectedUpdatedAt: '2026-07-22T12:00:00.000Z',
            goalTitle: 'Read together every evening', priorityPosition: 0,
            placement: { status: 'unplaced', reason: 'no_write_calendar' },
          }],
        },
      },
    });

    expect(sources).toEqual([
      expect.objectContaining({
        capabilityId: 'plan',
        object: expect.objectContaining({ id: 'activity-library', label: 'Visit the library' }),
        authority: 'derived',
        summary: expect.stringContaining('Needs placement: No write calendar'),
      }),
    ]);
  });

  test('resolves only capability-owned objects to exact native destinations', () => {
    expect(resolveUnifiedChatObjectReturn({ type: 'activity', id: 'activity-library', label: 'Visit the library' })).toMatchObject({
      route: { params: { screen: 'ActivitiesTab', params: { screen: 'ActivityDetail', params: { activityId: 'activity-library' } } } },
    });
    expect(resolveUnifiedChatObjectReturn({ type: 'arc', id: 'arc-1', label: 'Family' })).toMatchObject({
      capabilityId: 'arcs',
      route: {
        params: {
          screen: 'MoreTab',
          params: { screen: 'MoreArcs', params: { screen: 'ArcDetail', params: { arcId: 'arc-1' } } },
        },
      },
    });
    expect(resolveUnifiedChatObjectReturn({ type: 'profile', id: 'profile-1', label: 'Profile' })).toMatchObject({
      capabilityId: 'profile', route: { name: 'Settings', params: { screen: 'SettingsProfile' } },
    });
  });
});
