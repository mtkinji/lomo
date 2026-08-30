import type { Activity, Goal } from '../../domain/types';
import { createDeviceToolProvider } from './deviceToolProvider';
import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';

const activity: Activity = {
  id: 'activity-1', goalId: null, title: 'Read together', type: 'task', tags: [], status: 'planned',
  forceActual: {}, createdAt: 'before', updatedAt: 'current',
};
const goal: Goal = {
  id: 'goal-1', arcId: null, title: 'Calmer evenings', status: 'planned', forceIntent: {}, metrics: [],
  createdAt: 'before', updatedAt: 'current',
};
const snapshots = {
  goals: { goals: [goal] }, todos: { activities: [activity], goals: [goal] }, chapters: { chapters: [] },
  profile: { profile: {
    id: 'profile-1', createdAt: 'before', updatedAt: 'current',
    timezone: 'America/Denver', communication: {}, visuals: {},
    preferences: { plan: { availabilityVersion: 2, availability: {
      mon: { enabled: true, windows: { work: [{ start: '09:00', end: '17:00' }], personal: [] } },
      tue: { enabled: false, windows: { work: [], personal: [] } },
      wed: { enabled: false, windows: { work: [], personal: [] } },
      thu: { enabled: false, windows: { work: [], personal: [] } },
      fri: { enabled: false, windows: { work: [], personal: [] } },
      sat: { enabled: false, windows: { work: [], personal: [] } },
      sun: { enabled: false, windows: { work: [], personal: [] } },
    } } },
  } },
  screenTime: { children: [{
    householdId: 'household-1', membershipId: 'child-charlie', displayName: 'Charlie', canManage: true,
    policy: {
      childMembershipId: 'child-charlie', subjectId: 'subject-charlie', desiredPolicyVersion: 1,
      selections: [], agreements: [], activeOverrides: [], pendingRequests: [], devices: [], latestDeviceReceipt: null,
    },
  }] },
};
const tool = (id: string) => UNIFIED_CHAT_TOOL_CATALOG.find((candidate) => candidate.id === id)!;

test('stages Focus as pending device work without claiming a session started', async () => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({
    id: 'focus', toolId: 'activities.open_focus', arguments: { activityId: activity.id },
  }, tool('activities.open_focus'))).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: expect.objectContaining({ actionType: 'open_activity_focus', targetId: activity.id }),
  });
  expect(provider.actions()[0].consequenceSummary).toContain('still choose whether');
});

test('stages universal navigation only for an allow-listed capability destination', async () => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({
    id: 'open-recipe', toolId: 'navigation.open_capability', arguments: {
      capabilityId: 'recipes', objectRef: { objectType: 'recipe', objectId: 'recipe-1' },
    },
  }, tool('navigation.open_capability'))).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: {
      capabilityId: 'navigation', actionType: 'open_capability',
      targetType: 'recipe', targetId: 'recipe-1',
      title: 'Open Recipes',
      consequenceSummary: 'This only opens Recipes. Nothing changes.',
      payload: { capabilityId: 'recipes', objectRef: { objectType: 'recipe', objectId: 'recipe-1' } },
    },
  });

  await expect(provider.execute({
    id: 'open-games', toolId: 'navigation.open_capability', arguments: { capabilityId: 'games' },
  }, tool('navigation.open_capability'))).resolves.toMatchObject({
    status: 'failed', code: 'invalid_capability_navigation',
  });
  expect(provider.actions()).toHaveLength(1);
});

test('reads and applies haptics only on the executing device with optimistic review', async () => {
  let enabled = true;
  const apply = jest.fn(({ enabled: next }: { enabled: boolean }) => { enabled = next; });
  const provider = createDeviceToolProvider({
    snapshots,
    hapticsPreferences: { read: () => ({ enabled }), apply },
  });
  await expect(provider.execute({
    id: 'read-haptics', toolId: 'settings.haptics.read', arguments: {},
  }, tool('settings.haptics.read'))).resolves.toEqual({
    status: 'completed', output: { enabled: true, owner: 'this_device' }, receipt: null,
  });
  await expect(provider.execute({
    id: 'disable-haptics', toolId: 'settings.haptics.update',
    arguments: { expectedEnabled: true, enabled: false },
  }, tool('settings.haptics.update'))).resolves.toMatchObject({
    status: 'completed', output: { previousEnabled: true, enabled: false, changed: true },
  });
  expect(apply).toHaveBeenCalledWith({ enabled: false });
  await expect(provider.execute({
    id: 'stale-haptics', toolId: 'settings.haptics.update',
    arguments: { expectedEnabled: true, enabled: true },
  }, tool('settings.haptics.update'))).resolves.toMatchObject({
    status: 'failed', code: 'haptics_preference_conflict', retryable: true,
  });
});

test('reports bounded widget status and opens only the OS-owned setup surface', async () => {
  const provider = createDeviceToolProvider({
    snapshots,
    widgetPreferences: { readLastSyncMs: async () => 1_800_000_000_000 },
  });
  await expect(provider.execute({
    id: 'read-widgets', toolId: 'settings.widgets.read', arguments: {},
  }, tool('settings.widgets.read'))).resolves.toMatchObject({
    status: 'completed',
    output: { placementStatus: 'not_exposed_by_ios', owner: 'this_device' },
  });
  await expect(provider.execute({
    id: 'open-widgets', toolId: 'settings.widgets.configure', arguments: { openSetup: true },
  }, tool('settings.widgets.configure'))).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: { actionType: 'open_widgets_settings', targetType: 'device_setting', targetId: 'widgets' },
  });
  await expect(provider.execute({
    id: 'invent-widgets', toolId: 'settings.widgets.configure', arguments: { openSetup: true, shortcut: 'Money' },
  }, tool('settings.widgets.configure'))).resolves.toMatchObject({
    status: 'failed', code: 'invalid_widget_setup',
  });
});

test('reads and updates the actual bounded appearance preference on this device', async () => {
  let state = { updatedAt: 'appearance-v1', thumbnailStyles: ['topographyDots'] as const };
  const apply = jest.fn(({ thumbnailStyles }) => {
    state = { updatedAt: 'appearance-v2', thumbnailStyles } as never;
  });
  const provider = createDeviceToolProvider({ snapshots, appearancePreferences: {
    read: () => state,
    apply,
  } });
  await expect(provider.execute({
    id: 'read-appearance', toolId: 'settings.appearance.read', arguments: {},
  }, tool('settings.appearance.read'))).resolves.toMatchObject({
    status: 'completed', output: { updatedAt: 'appearance-v1', thumbnailStyles: ['topographyDots'] },
  });
  await expect(provider.execute({
    id: 'update-appearance', toolId: 'settings.appearance.update', arguments: {
      expectedUpdatedAt: 'appearance-v1', thumbnailStyles: ['geoMosaic', 'plainGradient'],
    },
  }, tool('settings.appearance.update'))).resolves.toMatchObject({
    status: 'completed', output: { changed: true, thumbnailStyles: ['geoMosaic', 'plainGradient'] },
  });
  expect(apply).toHaveBeenCalledWith({ thumbnailStyles: ['geoMosaic', 'plainGradient'] });
});

test('lists, opens, and revokes connected tools without accepting credentials', async () => {
  let revokedAt: string | null = null;
  const revoke = jest.fn(async () => { revokedAt = '2026-08-28T00:00:00.000Z'; });
  const connection = {
    client_id: 'client-1', client_name: 'ChatGPT', connection_type: 'oauth' as const,
    surface: 'chatgpt', scope: 'life.read life.write', connected_at: '2026-08-01T00:00:00.000Z',
    last_used_at: null, revoked_at: null, write_count: 2, last_action_at: null,
  };
  const provider = createDeviceToolProvider({ snapshots, connectedTools: {
    load: async () => ({ connections: [{ ...connection, revoked_at: revokedAt }], actions: [] }),
    revoke,
  } });
  await expect(provider.execute({
    id: 'list-connections', toolId: 'settings.connected_tools.list', arguments: {},
  }, tool('settings.connected_tools.list'))).resolves.toMatchObject({
    status: 'completed', output: { connections: [{ connectionId: 'client-1', name: 'ChatGPT' }] },
  });
  await expect(provider.execute({
    id: 'connect-cursor', toolId: 'settings.connected_tools.connect.open', arguments: { providerId: 'cursor' },
  }, tool('settings.connected_tools.connect.open'))).resolves.toMatchObject({
    status: 'pending_client_action', request: {
      actionType: 'open_connected_tool_setup', targetType: 'connection_provider', targetId: 'cursor',
    },
  });
  await expect(provider.execute({
    id: 'revoke-connection', toolId: 'settings.connected_tools.revoke', arguments: {
      connectionId: 'client-1', expectedConnectedAt: connection.connected_at,
    },
  }, tool('settings.connected_tools.revoke'))).resolves.toMatchObject({
    status: 'completed', output: { connectionId: 'client-1', revoked: true },
  });
  expect(revoke).toHaveBeenCalledWith('client-1');
});

test('reads and updates bounded Phone Agent preferences without exposing the phone or object IDs', async () => {
  const permissions = {
    create_activities: true, remember_relationships: false, send_followups: true,
    log_done_replies: false, offer_drafts: false, suggest_arc_alignment: true,
  };
  let current = {
    links: [{ phone: '+18015551234', status: 'verified', permissions, promptCapPerDay: 3,
      optedOutAt: null, timeZone: 'America/Denver' }],
    memorySummary: { peopleCount: 1, activeEventsCount: 0, activeCadencesCount: 0 },
    recentActions: [{ id: 'action-private', actionType: 'capture_activity', createdAt: 'now',
      activityId: 'activity-private', promptId: null }],
  };
  const update = jest.fn(async (input) => {
    current = { ...current, links: [{ ...current.links[0], permissions: input.permissions,
      promptCapPerDay: input.promptCapPerDay }] };
    return current;
  });
  const provider = createDeviceToolProvider({ snapshots, phoneAgentSettings: {
    load: async () => current,
    update,
  } });

  const read = await provider.execute({
    id: 'read-phone-agent', toolId: 'settings.phone_agent.read', arguments: {},
  }, tool('settings.phone_agent.read'));
  expect(read).toMatchObject({
    status: 'completed', output: { link: { maskedPhone: '••••1234', promptCapPerDay: 3 } },
  });
  expect(JSON.stringify(read)).not.toContain('+18015551234');
  expect(JSON.stringify(read)).not.toContain('activity-private');

  await expect(provider.execute({
    id: 'update-phone-agent', toolId: 'settings.phone_agent.update', arguments: {
      expectedPromptCapPerDay: 3, expectedPermissions: permissions,
      fields: { promptCapPerDay: 4, permissions: { offer_drafts: true } },
    },
  }, tool('settings.phone_agent.update'))).resolves.toMatchObject({
    status: 'completed', output: { promptCapPerDay: 4, changed: true,
      permissions: { offer_drafts: true } },
  });
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ phone: '+18015551234', promptCapPerDay: 4 }));
});

test('stages the current durable thread for the verified Phone Agent without accepting a phone number', async () => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({
    id: 'continue-phone', toolId: 'channel.phone.continue_run', arguments: {},
  }, tool('channel.phone.continue_run'))).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: { actionType: 'continue_thread_on_phone', payload: {} },
  });
  await expect(provider.execute({
    id: 'unsafe-phone', toolId: 'channel.phone.continue_run', arguments: { phone: '+18015551234' },
  }, tool('channel.phone.continue_run'))).resolves.toMatchObject({
    status: 'failed', code: 'invalid_phone_continuation',
  });
});

test.each([
  ['money.review_transaction', { transactionId: 'transaction-1' }, 'money_transaction'],
  ['money.category.update', { categoryId: 'category-1', fields: { budgetCents: 70000 } }, 'money_category'],
  ['money.privacy.configure', { enabled: true }, 'money'],
  ['money.connection.connect', {}, 'money'],
  ['money.connection.sync', { connectionId: 'connection-1' }, 'money_connection'],
] as const)('stages %s for its authenticated native Money surface', async (toolId, args, targetType) => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({ id: `call-${toolId}`, toolId, arguments: args }, tool(toolId)))
    .resolves.toMatchObject({
      status: 'pending_client_action', provider: 'device',
      request: { actionType: 'open_money_control', targetType, payload: { toolId } },
    });
});

test('reads and applies only an available AI model with optimistic review', async () => {
  let modelId = 'gpt-4o-mini';
  const apply = jest.fn(({ modelId: next }) => { modelId = next; });
  const provider = createDeviceToolProvider({ snapshots, aiModelPreferences: {
    read: () => ({ modelId, isPro: true }), apply,
  } });
  await expect(provider.execute({
    id: 'read-model', toolId: 'settings.ai_model.read', arguments: {},
  }, tool('settings.ai_model.read'))).resolves.toMatchObject({
    status: 'completed', output: { modelId: 'gpt-4o-mini', availableModelIds: expect.arrayContaining(['gpt-5.2']) },
  });
  await expect(provider.execute({
    id: 'update-model', toolId: 'settings.ai_model.update',
    arguments: { expectedModelId: 'gpt-4o-mini', modelId: 'gpt-5.2' },
  }, tool('settings.ai_model.update'))).resolves.toMatchObject({
    status: 'completed', output: { modelId: 'gpt-5.2', changed: true },
  });
  expect(apply).toHaveBeenCalledWith({ modelId: 'gpt-5.2' });
});

test('lists bounded sharing, stages native friend delivery, and confirms exact revocation', async () => {
  let friends = [{
    id: 'friendship-1', friendUserId: 'user-private', status: 'active' as const, initiatedByMe: true,
    createdAt: '2026-08-01T00:00:00.000Z', acceptedAt: '2026-08-02T00:00:00.000Z',
    name: 'Blaire', avatarUrl: null,
  }];
  const endFriendship = jest.fn(async () => { friends = []; return true; });
  const provider = createDeviceToolProvider({ snapshots, sharing: {
    loadFriendships: async () => ({ friends, pendingFriendRequests: [] }),
    loadGoalShares: async () => [],
    createFriendInvite: jest.fn(), shareFriendInvite: jest.fn(), endFriendship,
    revokeGoalInvitation: jest.fn(), removeGoalPartner: jest.fn(), leaveSharedGoal: jest.fn(),
  } });
  const read = await provider.execute({
    id: 'list-sharing', toolId: 'settings.sharing.list', arguments: {},
  }, tool('settings.sharing.list'));
  expect(read).toMatchObject({
    status: 'completed', output: { connections: [{
      connectionId: 'friendship:friendship-1', counterpartName: 'Blaire', revocable: true,
    }] },
  });
  expect(JSON.stringify(read)).not.toContain('user-private');

  await expect(provider.execute({
    id: 'prepare-friend', toolId: 'settings.sharing.invitation.prepare', arguments: { expiresInDays: 7 },
  }, tool('settings.sharing.invitation.prepare'))).resolves.toMatchObject({
    status: 'pending_client_action', request: { actionType: 'prepare_friend_invitation' },
  });
  await expect(provider.execute({
    id: 'revoke-friend', toolId: 'settings.sharing.connection.revoke', arguments: {
      connectionId: 'friendship:friendship-1', expectedFingerprint: 'friendship:2026-08-02T00:00:00.000Z',
    },
  }, tool('settings.sharing.connection.revoke'))).resolves.toMatchObject({
    status: 'completed', output: { revoked: true },
  });
  expect(endFriendship).toHaveBeenCalledWith('friendship-1');
});

test('manages curated execution targets without accepting URLs or commands', async () => {
  const definition = {
    id: 'cursor_mcp_v1', kind: 'cursor_repo', display_name: 'Cursor', description: null, version: 1,
    config_schema: {}, requirements_schema: {}, playbook_schema: {},
    default_config: { repo_name: '', repo_url: null, branch_policy: 'feature_branch', verification_commands: [] },
    default_requirements: {}, default_playbook: {},
  };
  let targets = [{
    id: 'target-1', owner_id: 'private-owner', definition_id: definition.id, kind: 'cursor_repo',
    display_name: 'Kwilt Cursor', config: { repo_name: 'Kwilt', repo_url: 'https://private.example',
      verification_commands: ['npm test'] }, requirements: {}, playbook: {}, is_enabled: true,
    created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-02T00:00:00.000Z',
  }];
  const update = jest.fn(async (input) => {
    const changed = { ...targets[0], display_name: input.displayName ?? targets[0].display_name,
      is_enabled: input.isEnabled ?? targets[0].is_enabled, config: input.config ?? targets[0].config,
      updated_at: '2026-08-03T00:00:00.000Z' };
    targets = [changed];
    return changed;
  });
  const remove = jest.fn(async () => { targets = []; return true; });
  const provider = createDeviceToolProvider({ snapshots, executionTargets: {
    loadDefinitions: async () => [definition], loadTargets: async () => targets,
    create: jest.fn(), update, remove,
  } });

  const read = await provider.execute({
    id: 'list-targets', toolId: 'settings.execution_targets.list', arguments: {},
  }, tool('settings.execution_targets.list'));
  expect(read).toMatchObject({ status: 'completed', output: { targets: [{ targetId: 'target-1', repoName: 'Kwilt' }] } });
  expect(JSON.stringify(read)).not.toMatch(/private-owner|private\.example|npm test/);

  await expect(provider.execute({
    id: 'update-target', toolId: 'settings.execution_targets.update', arguments: {
      targetId: 'target-1', expectedUpdatedAt: '2026-08-02T00:00:00.000Z', fields: { enabled: false },
    },
  }, tool('settings.execution_targets.update'))).resolves.toMatchObject({
    status: 'completed', output: { targetId: 'target-1', enabled: false },
  });
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ id: 'target-1', isEnabled: false }));

  await expect(provider.execute({
    id: 'delete-target', toolId: 'settings.execution_targets.delete', arguments: {
      targetId: 'target-1', expectedUpdatedAt: '2026-08-03T00:00:00.000Z',
    },
  }, tool('settings.execution_targets.delete'))).resolves.toMatchObject({
    status: 'completed', output: { targetId: 'target-1', deleted: true },
  });
  expect(remove).toHaveBeenCalledWith({ id: 'target-1' });
});

test('installs and uninstalls only curated retailer destinations', async () => {
  let enabled = { amazon: true } as Record<string, boolean>;
  const setEnabled = jest.fn((kind: string, value: boolean) => { enabled = { ...enabled, [kind]: value }; });
  const provider = createDeviceToolProvider({ snapshots, destinations: { readEnabled: () => enabled, setEnabled } });

  await expect(provider.execute({
    id: 'list-destinations', toolId: 'settings.destinations.list', arguments: {},
  }, tool('settings.destinations.list'))).resolves.toMatchObject({
    status: 'completed', output: { destinations: expect.arrayContaining([
      expect.objectContaining({ destinationId: 'amazon', installed: true }),
      expect.objectContaining({ destinationId: 'home_depot', installed: false }),
    ]) },
  });
  await expect(provider.execute({
    id: 'install-instacart', toolId: 'settings.destinations.create', arguments: { kind: 'instacart' },
  }, tool('settings.destinations.create'))).resolves.toMatchObject({
    status: 'completed', output: { destinationId: 'instacart', installed: true },
  });
  await expect(provider.execute({
    id: 'uninstall-amazon', toolId: 'settings.destinations.delete',
    arguments: { destinationId: 'amazon', expectedInstalled: true },
  }, tool('settings.destinations.delete'))).resolves.toMatchObject({
    status: 'completed', output: { destinationId: 'amazon', installed: false },
  });
  await expect(provider.execute({
    id: 'unsafe-destination', toolId: 'settings.destinations.create', arguments: { kind: 'https://evil.example' },
  }, tool('settings.destinations.create'))).resolves.toMatchObject({
    status: 'failed', code: 'invalid_destination',
  });
});

test('creates, reads, renames, and archives exact Activity areas', async () => {
  let areas = [{
    id: 'area-work', label: 'Work', order: 0, isDefault: true,
    scheduling: { enabled: true, fallbackMode: 'work' as const },
  }];
  const apply = jest.fn((next) => { areas = next; });
  const provider = createDeviceToolProvider({ snapshots, activityAreas: {
    read: () => ({ areas, activities: [{ ...activity, areaId: 'area-work' }] }), apply,
  } });
  const listed = await provider.execute({
    id: 'list-areas', toolId: 'settings.activity_areas.list', arguments: {},
  }, tool('settings.activity_areas.list'));
  expect(listed).toMatchObject({ status: 'completed', output: { areas: [{
    areaId: 'area-work', label: 'Work', affectedActivityCount: 1, fingerprint: expect.stringMatching(/^area:/),
  }] } });
  const reference = (listed as any).output.areas[0];

  await expect(provider.execute({
    id: 'rename-area', toolId: 'settings.activity_areas.update', arguments: {
      areaId: reference.areaId, expectedFingerprint: reference.fingerprint, label: 'Deep work',
    },
  }, tool('settings.activity_areas.update'))).resolves.toMatchObject({
    status: 'completed', output: { areaId: 'area-work', label: 'Deep work' },
  });
  expect(apply).toHaveBeenCalled();
});

test('stages a Goal check-in draft for native audience review', async () => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({
    id: 'check-in', toolId: 'goals.check_in', arguments: {
      goalId: goal.id,
      text: 'We kept evenings calm three nights this week.',
    },
  }, tool('goals.check_in'))).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: expect.objectContaining({
      actionType: 'open_goal_checkin',
      targetId: goal.id,
      payload: { text: 'We kept evenings calm three nights this week.' },
    }),
  });
  expect(provider.actions()[0].consequenceSummary).toContain('Nothing is sent');
});

test('rejects a Goal check-in when the Goal or draft text is invalid', async () => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({
    id: 'missing-goal', toolId: 'goals.check_in', arguments: { goalId: 'missing', text: 'Update' },
  }, tool('goals.check_in'))).resolves.toMatchObject({ status: 'failed', code: 'goal_not_found' });
  await expect(provider.execute({
    id: 'blank', toolId: 'goals.check_in', arguments: { goalId: goal.id, text: '   ' },
  }, tool('goals.check_in'))).resolves.toMatchObject({ status: 'failed', code: 'invalid_checkin_text' });
});

test.each([
  ['notifications.configure', 'configure_notifications'],
  ['account.subscription.open', 'open_subscription_management'],
  ['account.delete.open', 'open_account_deletion'],
])('stages %s behind an explicit native consequence summary', async (toolId, actionType) => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({ id: toolId, toolId, arguments: {} }, tool(toolId)))
    .resolves.toMatchObject({ status: 'pending_client_action' });
  expect(provider.actions()).toEqual([expect.objectContaining({ actionType })]);
  expect(provider.actions()[0].consequenceSummary.length).toBeGreaterThan(20);
});

test('stages an exact authorized child Screen Time intent for native review', async () => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({
    id: 'screen-time', toolId: 'screen_time.configure',
    arguments: { childName: 'Charlie', appName: 'Brawl Stars', desiredAccess: 'allow' },
  }, tool('screen_time.configure'))).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: expect.objectContaining({
      actionType: 'open_family_screen_time_setup', targetId: 'child-charlie',
      payload: expect.objectContaining({
        childDisplayName: 'Charlie', setupStep: 'selection', suggestedLabel: 'Brawl Stars', desiredAccess: 'allow',
      }),
    }),
  });
  expect(provider.actions()[0].consequenceSummary).toContain('Nothing changes until');
});

test('reads bounded Plan calendar choices and stages an exact native selection review', async () => {
  const calendarPreferences = { load: jest.fn(async () => ({
    accounts: [{ id: '1', provider: 'google' as const, accountId: 'account-1', email: null, displayName: 'Andrew', status: 'active' as const }],
    calendars: [{ provider: 'google' as const, accountId: 'account-1', calendarId: 'primary', name: 'Work', canWrite: true }],
    errors: [],
    preferences: { version: 2, readCalendarRefs: [], writeCalendarRef: null },
  })) };
  const provider = createDeviceToolProvider({ snapshots, calendarPreferences });
  await expect(provider.execute({ id: 'read-calendars', toolId: 'plan.calendars.read', arguments: {} },
    tool('plan.calendars.read'))).resolves.toMatchObject({
    status: 'completed', output: { version: 2, authorization: 'connected', calendars: [{ name: 'Work' }] },
  });
  await expect(provider.execute({ id: 'update-calendars', toolId: 'plan.calendars.update', arguments: {
    expectedVersion: 2, readCalendarIds: ['google:account-1:primary'], writeCalendarId: 'google:account-1:primary',
  } }, tool('plan.calendars.update'))).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: { actionType: 'review_plan_calendars', payload: {
      expectedVersion: 2, readCalendarIds: ['google:account-1:primary'],
      writeCalendarId: 'google:account-1:primary', addedReadCalendarIds: ['google:account-1:primary'],
      removedReadCalendarIds: [], writeCalendarChanged: true,
    } },
  });
});

test('opens native calendar authorization when no connected calendars can satisfy a read', async () => {
  const provider = createDeviceToolProvider({ snapshots, calendarPreferences: { load: async () => ({
    accounts: [], calendars: [], errors: [], preferences: { version: 0, readCalendarRefs: [], writeCalendarRef: null },
  }) } });
  await expect(provider.execute({ id: 'read-calendars', toolId: 'plan.calendars.read', arguments: {} },
    tool('plan.calendars.read'))).resolves.toMatchObject({
    status: 'pending_client_action', request: { actionType: 'review_plan_calendars', payload: { reason: 'not_connected' } },
  });
});

test('stages personal Screen Time setup for self without substituting a child', async () => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({
    id: 'personal-setup', toolId: 'screen_time.personal.setup.open',
    arguments: { subject: { kind: 'self' } },
  }, tool('screen_time.personal.setup.open'))).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: expect.objectContaining({
      actionType: 'configure_screen_time', targetType: 'personal_screen_time_device',
      targetId: 'self', payload: { subject: { kind: 'self' } },
    }),
  });
  expect(provider.actions()[0].title).toBe('Set up My Screen Time');
});

test('stages a bounded personal daily app limit for native review', async () => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({
    id: 'personal-limit', toolId: 'screen_time.personal.limit.open',
    arguments: {
      subject: { kind: 'self' }, suggestedAppLabel: 'Instagram', limitMinutes: 10, reset: 'daily',
    },
  }, tool('screen_time.personal.limit.open'))).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: expect.objectContaining({
      actionType: 'open_personal_screen_time_limit',
      targetType: 'personal_screen_time_device', targetId: 'self',
      payload: {
        subject: { kind: 'self' }, suggestedAppLabel: 'Instagram', limitMinutes: 10, reset: 'daily',
      },
    }),
  });
  expect(provider.actions()[0].title).toBe('Review 10-minute app limit');
  expect(provider.actions()[0].consequenceSummary).toContain('choose the apps');
});

test('stages a self Money condition and Screen Time effect in the canonical category editor', async () => {
  const provider = createDeviceToolProvider({
    snapshots: {
      ...snapshots,
      money: { categories: [{ id: 'shopping', sourceId: 'shopping', name: 'Shopping' }] },
    } as never,
  });
  await expect(provider.execute({
    id: 'money-app-control', toolId: 'money.app_control.review', arguments: {
      subject: { kind: 'self' },
      condition: { owner: 'money', categoryId: 'shopping', preset: 'when_hot' },
      effect: { owner: 'screenTime', kind: 'pause_selected_apps', suggestedAppLabels: ['Amazon', 'shopping apps'] },
    },
  }, tool('money.app_control.review'))).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: expect.objectContaining({
      capabilityId: 'money', actionType: 'review_money_app_control',
      targetType: 'money_category', targetId: 'shopping',
      payload: {
        subject: { kind: 'self' }, preset: 'when_hot',
        suggestedAppLabels: ['Amazon', 'shopping apps'],
      },
    }),
  });
  expect(provider.actions()[0].consequenceSummary).toContain('choose the apps');
  expect(provider.actions()[0].consequenceSummary).toContain('Nothing is applied');
});

test('names missing Screen Time intent fields instead of staging a generic setup action', async () => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({
    id: 'screen-time', toolId: 'screen_time.configure', arguments: { childName: 'Charlie' },
  }, tool('screen_time.configure'))).resolves.toEqual({
    status: 'needs_input',
    prompt: 'Which child, app, and access change should Kwilt prepare for Screen Time review?',
    fields: ['childName', 'appName', 'desiredAccess'],
  });
  expect(provider.actions()).toEqual([]);
});

test.each([
  ['screen_time.selection.open', { childMembershipId: 'child-charlie', suggestedLabel: 'YouTube' }, 'selection', 'still finish'],
  ['screen_time.device.setup.open', { childMembershipId: 'child-charlie' }, 'device', 'still finish'],
  ['screen_time.device.release.open', { childMembershipId: 'child-charlie' }, 'release', 'stays on until'],
])('stages %s for the exact authorized child without claiming completion', async (toolId, args, setupStep, pendingCopy) => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({ id: toolId, toolId, arguments: args }, tool(toolId)))
    .resolves.toMatchObject({
      status: 'pending_client_action', provider: 'device',
      request: expect.objectContaining({
        actionType: 'open_family_screen_time_setup', targetId: 'child-charlie',
        payload: expect.objectContaining({
          householdId: 'household-1', childDisplayName: 'Charlie', setupStep,
        }),
      }),
    });
  expect(provider.actions()[0].consequenceSummary).toContain(pendingCopy);
});

test('rejects a Screen Time handoff outside the authorized child snapshot', async () => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({
    id: 'setup', toolId: 'screen_time.device.setup.open', arguments: { childMembershipId: 'other-child' },
  }, tool('screen_time.device.setup.open'))).resolves.toMatchObject({
    status: 'failed', code: 'screen_time_child_not_found',
  });
  expect(provider.actions()).toEqual([]);
});

test('opens the native Activity-backed Chores surface without claiming a Chore changed', async () => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({ id: 'chores-open', toolId: 'chores.open', arguments: {} }, tool('chores.open')))
    .resolves.toMatchObject({
      status: 'pending_client_action', provider: 'device',
      request: expect.objectContaining({ capabilityId: 'chores', actionType: 'open_chores' }),
    });
});

test('reads exact versioned Plan availability and stages a reviewed weekly diff', async () => {
  const provider = createDeviceToolProvider({ snapshots: snapshots as never });
  await expect(provider.execute({ id: 'read-availability', toolId: 'plan.availability.read', arguments: {} },
    tool('plan.availability.read'))).resolves.toMatchObject({
    status: 'completed', output: {
      version: 2, timeZone: 'America/Denver',
      windows: [{ weekday: 1, mode: 'work', startLocalTime: '09:00', endLocalTime: '17:00' }],
    },
  });

  await expect(provider.execute({
    id: 'update-availability', toolId: 'plan.availability.update', arguments: {
      expectedVersion: 2,
      timeZone: 'America/Chicago',
      windows: [{ weekday: 1, mode: 'personal', startLocalTime: '18:00', endLocalTime: '21:00' }],
    },
  }, tool('plan.availability.update'))).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: expect.objectContaining({
      capabilityId: 'plan', actionType: 'review_plan_availability',
      payload: expect.objectContaining({ expectedVersion: 2, timeZone: 'America/Chicago', affectedWeekdays: [1] }),
    }),
  });
  expect(provider.actions()[0].consequenceSummary).toContain('Nothing changes until');
});

test('refuses a stale Plan availability review', async () => {
  const provider = createDeviceToolProvider({ snapshots: snapshots as never });
  await expect(provider.execute({
    id: 'stale-availability', toolId: 'plan.availability.update', arguments: {
      expectedVersion: 1, timeZone: 'America/Denver', windows: [],
    },
  }, tool('plan.availability.update'))).resolves.toMatchObject({
    status: 'failed', code: 'plan_availability_version_stale', retryable: true,
  });
  expect(provider.actions()).toEqual([]);
});

test.each([
  ['recipes.publication.prepare', {
    recipeVersionId: 'version-1', publicProfileId: 'profile-1', distributionScopes: ['kwilt_mobile'],
  }, 'open_recipe_publication_review', 'recipe-1'],
  ['food_scenario.accept', { scenarioId: 'scenario-1', expectedVersion: 2 }, 'open_food_scenario_review', 'scenario-1'],
  ['savings.review', { groceryListId: 'list-1', provider: 'kroger', locationId: 'store-1' }, 'open_grocery_savings', 'list-1'],
  ['receipt.extract', { sourceArtifactRefs: ['attachment-1'] }, 'open_grocery_receipt_review', null],
] as const)('stages %s as exact native Food review without claiming completion', async (
  toolId, args, actionType, targetId,
) => {
  const provider = createDeviceToolProvider({ snapshots: {
    ...snapshots,
    recipes: { recipes: [{ recipe: { id: 'recipe-1' }, currentVersion: { id: 'version-1' } }] },
  } as never });
  await expect(provider.execute({ id: toolId, toolId, arguments: args }, tool(toolId)))
    .resolves.toMatchObject({
      status: 'pending_client_action', provider: 'device',
      request: expect.objectContaining({ actionType, targetId }),
    });
  expect(provider.actions()[0].consequenceSummary).toMatch(/Nothing|not |yet|still|until|only after/i);
});
