import {
  EXTERNAL_MCP_ACTION_CATALOG,
  EXTERNAL_MCP_CONTROL_COVERAGE,
  EXTERNAL_MCP_READ_TOOLS,
  EXTERNAL_MCP_WRITE_TOOLS,
  normalizeExternalWriteRequestId,
  normalizeGetArcArgs,
  normalizeGetGoalArgs,
  normalizeListGoalsArgs,
  normalizeListRecentActivitiesArgs,
  resolveExternalMcpTool,
  summarizeActivity,
  summarizeArc,
  summarizeChapter,
  summarizeCurrentAccount,
  summarizeGoal,
  summarizeShowUpStatus,
} from '../externalMcp';

describe('externalMcp helpers', () => {
  test('snapshots generated names, schemas, annotations, scopes, and compatibility aliases', () => {
    expect(EXTERNAL_MCP_ACTION_CATALOG.map((tool) => ({
      name: tool.name,
      canonicalName: tool.canonicalName,
      operationId: tool.operationId,
      toolId: tool.toolId,
      inputSchema: tool.inputSchema,
      outputSchema: tool.outputSchema,
      annotations: tool.annotations,
      scopes: tool.requiredScopes,
      compatibilityAlias: tool.compatibilityAlias,
    }))).toMatchSnapshot();
  });

  test('exports only strict schemas projected from handler-backed registrations', () => {
    const assertStrict = (schema: unknown): void => {
      if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return;
      const record = schema as Record<string, unknown>;
      if (record.type === 'object') {
        expect(record.additionalProperties).toBe(false);
        const properties = record.properties && typeof record.properties === 'object' && !Array.isArray(record.properties)
          ? record.properties as Record<string, unknown>
          : {};
        for (const child of Object.values(properties)) assertStrict(child);
      }
      if (record.type === 'array') assertStrict(record.items);
      for (const child of Array.isArray(record.oneOf) ? record.oneOf : []) assertStrict(child);
    };

    expect(EXTERNAL_MCP_ACTION_CATALOG).toHaveLength(58);
    for (const tool of EXTERNAL_MCP_ACTION_CATALOG) {
      assertStrict(tool.inputSchema);
      expect(tool.outputSchema).toEqual(expect.objectContaining({ type: 'object' }));
    }
  });

  test('keeps every manifest operation in an explicit external-control state', () => {
    expect(EXTERNAL_MCP_CONTROL_COVERAGE).toHaveLength(145);
    expect(EXTERNAL_MCP_CONTROL_COVERAGE.filter((row) => row.state === 'excluded')
      .every((row) => row.owner === 'games' || row.owner === 'explore')).toBe(true);
    expect(new Set(EXTERNAL_MCP_ACTION_CATALOG.map((tool) => tool.operationId)))
      .toEqual(new Set(EXTERNAL_MCP_CONTROL_COVERAGE
        .filter((row) => row.state === 'exposed')
        .map((row) => row.operationId)));
    expect(EXTERNAL_MCP_CONTROL_COVERAGE
      .filter((row) => row.state === 'pending_registration')
      .map((row) => row.operationId)).toEqual([]);
    expect(EXTERNAL_MCP_CONTROL_COVERAGE
      .filter((row) => row.state === 'not_applicable')
      .map((row) => row.operationId)).toEqual(['general.answer', 'general.answer_with_context']);
    expect(EXTERNAL_MCP_CONTROL_COVERAGE
      .filter((row) => row.state === 'explicit_boundary')
      .map((row) => row.operationId)).toEqual([
        'relationships.forget_person',
        'recipes.publication.attest_rights',
        'groceries.checkout',
        'groceries.payment',
        'savings.coupon.apply_unsupported',
      ]);
  });

  describe('EXTERNAL_MCP_READ_TOOLS', () => {
    test('advertises the Sprint A read-only tool set', () => {
      expect(EXTERNAL_MCP_READ_TOOLS.map((tool) => tool.name)).toEqual(expect.arrayContaining([
        'get_current_account',
        'list_arcs',
        'list_goals',
        'list_recent_activities',
        'get_current_chapter',
        'kwilt_plan_read_day_context',
        'kwilt_plan_recommend_day',
        'kwilt_relationships_read',
        'kwilt_household_read',
        'kwilt_household_invitation_preview',
      ]));
    });

    test('every tool is annotated read-only and non-destructive', () => {
      for (const tool of EXTERNAL_MCP_READ_TOOLS) {
        expect(tool.annotations.title).toEqual(expect.any(String));
        expect(tool.annotations.readOnlyHint).toBe(true);
        expect(tool.annotations.destructiveHint).toBe(false);
        expect(tool.annotations.idempotentHint).toBe(true);
        expect(tool.annotations.openWorldHint).toBe(false);
      }
    });
  });

  describe('EXTERNAL_MCP_WRITE_TOOLS', () => {
    test('advertises the write tool set for Arcs, Goals, Activities, check-ins, and chapter notes', () => {
      expect(EXTERNAL_MCP_WRITE_TOOLS.map((tool) => tool.name)).toEqual(expect.arrayContaining([
        'create_arc',
        'create_goal',
        'capture_activity',
        'update_chapter_user_note',
        'kwilt_plan_schedule_activity',
        'kwilt_plan_reschedule_activity',
        'kwilt_plan_remove_activity',
        'kwilt_activities_schedule',
        'kwilt_plan_schedule_chunks',
        'kwilt_activities_reminder_update',
        'kwilt_activities_repeat_update',
        'kwilt_relationships_remember',
        'kwilt_relationships_correct',
        'kwilt_relationships_forget',
        'kwilt_profile_update',
        'kwilt_goals_share_open',
        'kwilt_activities_focus_open',
        'kwilt_activities_location_update',
        'kwilt_activities_attachments_open',
        'kwilt_activities_share_open',
        'kwilt_plan_preferences_open',
        'kwilt_notifications_configure',
        'kwilt_search_open',
        'kwilt_account_settings_open',
        'kwilt_account_subscription_open',
        'kwilt_account_delete_open',
        'kwilt_screen_time_configure',
      ]));
    });

    test('marks all write tools as non-read-only and delete tools as destructive', () => {
      for (const tool of EXTERNAL_MCP_WRITE_TOOLS) {
        const schema = tool.inputSchema as any;
        expect(tool.scope).toBe('write');
        expect(tool.annotations.title).toEqual(expect.any(String));
        expect(tool.annotations.readOnlyHint).toBe(false);
        expect(tool.annotations.openWorldHint).toBe(false);
        expect(schema.properties?.idempotency_key).toBeDefined();
        expect(schema.required).toContain('idempotency_key');
        expect(tool.requiredScopes.some((scope) => scope.endsWith('.write'))).toBe(true);
      }
    });

    test('uses Life read scope for every currently exposed read tool', () => {
      for (const tool of EXTERNAL_MCP_READ_TOOLS) {
        expect(tool.requiredScopes.some((scope) => scope.endsWith('.read'))).toBe(true);
      }
    });

    test('accepts bounded stable write request IDs and rejects weak values', () => {
      expect(normalizeExternalWriteRequestId(' request-123 ')).toBe('request-123');
      expect(normalizeExternalWriteRequestId('short')).toBeNull();
      expect(normalizeExternalWriteRequestId('x'.repeat(201))).toBeNull();
      expect(normalizeExternalWriteRequestId(null)).toBeNull();
    });

    test('keeps compound step replacement out of activity create and update tools', () => {
      const capture = resolveExternalMcpTool('capture_activity');
      const update = resolveExternalMcpTool('update_activity');

      expect((capture?.inputSchema as any).properties.steps).toBeUndefined();
      expect((update?.inputSchema as any).properties.steps).toBeUndefined();
    });

    test('advertises first-class activity step tools', () => {
      const tools = Object.fromEntries([
        'create_activity_step', 'update_activity_step', 'mark_activity_step_done',
        'delete_activity_step', 'reorder_activity_steps',
      ].map((name) => [name, resolveExternalMcpTool(name)?.inputSchema as any]));

      expect(tools.create_activity_step.properties).toMatchObject({
        activity_id: { type: 'string' },
        title: { type: 'string' },
      });
      expect(tools.update_activity_step.properties).toMatchObject({
        activity_id: { type: 'string' },
        step_id: { type: 'string' },
      });
      expect(tools.mark_activity_step_done.properties).toMatchObject({
        activity_id: { type: 'string' },
        step_id: { type: 'string' },
      });
      expect(tools.delete_activity_step.properties).toMatchObject({
        activity_id: { type: 'string' },
        step_id: { type: 'string' },
      });
      expect(tools.reorder_activity_steps.properties).toMatchObject({
        activity_id: { type: 'string' },
        step_ids: { type: 'array', items: { type: 'string' } },
      });
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

    test('summarizeActivity includes steps only in rich mode', () => {
      const activity = {
        id: 'activity-1',
        title: 'Improve to-do organization',
        steps: [
          {
            id: 'step-1',
            title: 'Write the brief',
            completedAt: '2026-06-23T12:00:00.000Z',
            isOptional: true,
            orderIndex: 2,
          },
          { id: 'step-empty', title: '   ' },
        ],
      };

      expect(summarizeActivity(activity, { includeRich: false })).not.toHaveProperty('steps');
      expect(summarizeActivity(activity, { includeRich: true })).toMatchObject({
        steps: [
          {
            id: 'step-1',
            title: 'Write the brief',
            completed_at: '2026-06-23T12:00:00.000Z',
            is_optional: true,
            order_index: 2,
          },
        ],
      });
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

    test('summarizeCurrentAccount exposes only account identity basics', () => {
      expect(
        summarizeCurrentAccount({
          id: 'user-1',
          email: 'andrew@example.com',
          phone: '+15555550123',
          user_metadata: { private_note: 'do not expose' },
          identities: [
            { provider: 'email', identity_data: { email: 'andrew@example.com' } },
            { provider: 'email' },
            { provider: 'google' },
            { provider: null },
          ],
        }),
      ).toEqual({
        user_id: 'user-1',
        email: 'andrew@example.com',
        phone: '+15555550123',
        providers: ['email', 'google'],
      });
    });
  });
});
