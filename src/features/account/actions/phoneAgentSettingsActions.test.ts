import {
  PhoneAgentSettingsConflictError,
  createPhoneAgentSettingsActions,
  type PhoneAgentSettingsBoundary,
} from './phoneAgentSettingsActions';
import type { PhoneAgentStatus } from '../../../services/phoneAgent';

const permissions = {
  create_activities: true, remember_relationships: false, send_followups: true,
  log_done_replies: false, offer_drafts: false, suggest_arc_alignment: true,
};

function status(overrides: Partial<PhoneAgentStatus['links'][number]> = {}): PhoneAgentStatus {
  return {
    links: [{ phone: '+18015551234', status: 'verified', permissions, promptCapPerDay: 3,
      optedOutAt: null, timeZone: 'America/Denver', ...overrides }],
    memorySummary: { peopleCount: 2, activeEventsCount: 1, activeCadencesCount: 1 },
    recentActions: [{ id: 'secret-action', actionType: 'capture_activity', createdAt: 'now', activityId: 'secret-activity', promptId: null }],
  };
}

function boundary(): PhoneAgentSettingsBoundary & { update: jest.Mock } {
  let current = status();
  const update = jest.fn(async (input) => {
    current = status({ permissions: input.permissions, promptCapPerDay: input.promptCapPerDay });
    return current;
  });
  return { load: async () => current, update };
}

test('reads bounded Phone Agent status with a masked phone and no object IDs', async () => {
  const result = await createPhoneAgentSettingsActions(boundary()).read();
  expect(result).toMatchObject({
    link: { maskedPhone: '••••1234', status: 'verified', promptCapPerDay: 3, permissions },
    memorySummary: { peopleCount: 2 },
    recentActions: [{ actionType: 'capture_activity', createdAt: 'now' }],
  });
  expect(JSON.stringify(result)).not.toContain('+18015551234');
  expect(JSON.stringify(result)).not.toContain('secret-activity');
});

test('updates supported preferences and verifies the provider result', async () => {
  const phone = boundary();
  await expect(createPhoneAgentSettingsActions(phone).update({
    expectedPromptCapPerDay: 3,
    expectedPermissions: permissions,
    fields: { promptCapPerDay: 5, permissions: { offer_drafts: true } },
  })).resolves.toMatchObject({
    promptCapPerDay: 5,
    permissions: { ...permissions, offer_drafts: true },
    changed: true,
  });
  expect(phone.update).toHaveBeenCalledWith({
    phone: '+18015551234', promptCapPerDay: 5,
    permissions: { ...permissions, offer_drafts: true },
  });
});

test('rejects stale, unknown, and out-of-range preference changes', async () => {
  const actions = createPhoneAgentSettingsActions(boundary());
  await expect(actions.update({
    expectedPromptCapPerDay: 2, expectedPermissions: permissions,
    fields: { promptCapPerDay: 5 },
  })).rejects.toThrow(PhoneAgentSettingsConflictError);
  await expect(actions.update({
    expectedPromptCapPerDay: 3, expectedPermissions: permissions,
    fields: { promptCapPerDay: 11 },
  })).rejects.toThrow('Phone Agent');
  await expect(actions.update({
    expectedPromptCapPerDay: 3, expectedPermissions: permissions,
    fields: { permissions: { arbitrary_command: true } as never },
  })).rejects.toThrow('Phone Agent');
});
