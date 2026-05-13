import {
  EXTERNAL_MCP_READ_TOOLS,
  normalizeGetArcArgs,
  normalizeGetGoalArgs,
  normalizeListGoalsArgs,
  normalizeListRecentActivitiesArgs,
  summarizeActivity,
  summarizeArc,
  summarizeChapter,
  summarizeGoal,
  summarizeShowUpStatus,
} from '../externalMcp';

describe('externalMcp helpers', () => {
  describe('EXTERNAL_MCP_READ_TOOLS', () => {
    test('advertises the Sprint A read-only tool set', () => {
      expect(EXTERNAL_MCP_READ_TOOLS.map((tool) => tool.name)).toEqual([
        'list_arcs',
        'get_arc',
        'list_goals',
        'get_goal',
        'list_recent_activities',
        'get_current_chapter',
        'get_show_up_status',
      ]);
    });

    test('every tool is annotated read-only and non-destructive', () => {
      for (const tool of EXTERNAL_MCP_READ_TOOLS) {
        expect(tool.annotations.readOnlyHint).toBe(true);
        expect(tool.annotations.destructiveHint).toBe(false);
        expect(tool.annotations.openWorldHint).toBe(false);
      }
    });
  });

  describe('normalizeListRecentActivitiesArgs', () => {
    test('defaults to a 7-day window and rich=false', () => {
      expect(normalizeListRecentActivitiesArgs(undefined)).toEqual({ days: 7, includeRich: false });
      expect(normalizeListRecentActivitiesArgs({})).toEqual({ days: 7, includeRich: false });
    });

    test('clamps days into the documented range', () => {
      expect(normalizeListRecentActivitiesArgs({ days: 0 }).days).toBe(1);
      expect(normalizeListRecentActivitiesArgs({ days: 9999 }).days).toBe(90);
    });

    test('accepts boolean and string include_rich', () => {
      expect(normalizeListRecentActivitiesArgs({ include_rich: true }).includeRich).toBe(true);
      expect(normalizeListRecentActivitiesArgs({ include_rich: 'true' }).includeRich).toBe(true);
      expect(normalizeListRecentActivitiesArgs({ include_rich: 'no' }).includeRich).toBe(false);
    });
  });

  describe('normalizeListGoalsArgs', () => {
    test('falls back to active statuses and limit=50 when nothing is passed', () => {
      expect(normalizeListGoalsArgs({})).toEqual({
        arcId: null,
        statuses: ['planned', 'in_progress'],
        limit: 50,
      });
    });

    test('keeps only known statuses and clamps limit', () => {
      expect(normalizeListGoalsArgs({ status: ['in_progress', 'banana'], limit: 9999 })).toEqual({
        arcId: null,
        statuses: ['in_progress'],
        limit: 100,
      });
    });

    test('accepts a single status string', () => {
      expect(normalizeListGoalsArgs({ status: 'completed', arc_id: 'arc-1' })).toEqual({
        arcId: 'arc-1',
        statuses: ['completed'],
        limit: 50,
      });
    });
  });

  describe('normalizeGetArcArgs and normalizeGetGoalArgs', () => {
    test('extracts ids and ignores junk', () => {
      expect(normalizeGetArcArgs({ arc_id: 'arc-1', noise: 1 })).toEqual({ arcId: 'arc-1' });
      expect(normalizeGetArcArgs({})).toEqual({ arcId: null });
      expect(normalizeGetGoalArgs({ goal_id: 'goal-1' })).toEqual({ goalId: 'goal-1' });
      expect(normalizeGetGoalArgs({})).toEqual({ goalId: null });
    });
  });

  describe('summarizers strip raw payloads to safe public shapes', () => {
    test('summarizeArc keeps identity statement only', () => {
      expect(
        summarizeArc({
          id: 'arc-1',
          name: 'Family Stewardship',
          status: 'active',
          identity: { statement: 'I am present for my people.', secret_notes: 'no' },
          updatedAt: '2026-05-01T00:00:00.000Z',
        }),
      ).toEqual({
        id: 'arc-1',
        name: 'Family Stewardship',
        status: 'active',
        identity_statement: 'I am present for my people.',
        updated_at: '2026-05-01T00:00:00.000Z',
      });
    });

    test('summarizeGoal exposes force intent but not free-text notes', () => {
      const summary = summarizeGoal({
        id: 'goal-1',
        arcId: 'arc-1',
        title: 'Finish the deck',
        status: 'in_progress',
        forceIntent: { focus: 'high', urgency: 'med' },
        notes: 'private notes',
        updatedAt: '2026-05-01T00:00:00.000Z',
      });
      expect(summary).toEqual({
        id: 'goal-1',
        arc_id: 'arc-1',
        title: 'Finish the deck',
        status: 'in_progress',
        force_intent: { focus: 'high', urgency: 'med' },
        updated_at: '2026-05-01T00:00:00.000Z',
      });
    });

    test('summarizeActivity omits notes/tags unless includeRich is true', () => {
      const base = {
        id: 'act-1',
        goalId: 'goal-1',
        title: 'Outline the talk',
        status: 'planned',
        type: 'task',
        notes: 'private',
        tags: ['private'],
        forceActual: { focus: 'low' },
        updatedAt: '2026-05-01T00:00:00.000Z',
      };
      expect(summarizeActivity(base, { includeRich: false })).toEqual({
        id: 'act-1',
        goal_id: 'goal-1',
        title: 'Outline the talk',
        status: 'planned',
        type: 'task',
        scheduled_date: null,
        completed_at: null,
        updated_at: '2026-05-01T00:00:00.000Z',
      });
      const rich = summarizeActivity(base, { includeRich: true });
      expect(rich.notes).toBe('private');
      expect(rich.tags).toEqual(['private']);
      expect(rich.force_actual).toEqual({ focus: 'low' });
    });

    test('summarizeChapter exposes only narrative/title metadata', () => {
      expect(
        summarizeChapter({
          id: 'chap-1',
          period_start: '2026-04-01T00:00:00.000Z',
          period_end: '2026-04-30T00:00:00.000Z',
          period_key: '2026-04',
          output_json: { title: 'April lookback', narrative: 'You showed up most weeks.', private_scratch: 'no' },
          updated_at: '2026-05-01T00:00:00.000Z',
        }),
      ).toEqual({
        id: 'chap-1',
        period_start: '2026-04-01T00:00:00.000Z',
        period_end: '2026-04-30T00:00:00.000Z',
        period_key: '2026-04',
        title: 'April lookback',
        narrative: 'You showed up most weeks.',
        updated_at: '2026-05-01T00:00:00.000Z',
      });
    });

    test('summarizeShowUpStatus computes repair_window_active from the legacy timestamp', () => {
      const now = Date.now();
      expect(
        summarizeShowUpStatus({
          last_show_up_date: '2026-05-12',
          current_show_up_streak: 7,
          current_covered_show_up_streak: 4,
          eligible_repair_until_ms: now + 60_000,
        }),
      ).toEqual({
        last_show_up_date: '2026-05-12',
        current_show_up_streak: 7,
        current_covered_show_up_streak: 4,
        repair_window_active: true,
      });
      expect(summarizeShowUpStatus({}).repair_window_active).toBe(false);
    });
  });
});
