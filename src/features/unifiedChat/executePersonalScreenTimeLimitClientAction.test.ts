import { DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS } from '../../services/screenTimeProtection';
import type { PersonalCompositeScreenTimeRule } from '../screen-time/domain/personalCompositeScreenTimeRule';
import type { UnifiedChatClientAction } from './types';
import { ClientActionPresentationCancelledError } from './executeClientActionDecision';
import { executePersonalScreenTimeLimitClientAction } from './executePersonalScreenTimeLimitClientAction';

const action: UnifiedChatClientAction = {
  id: 'action-1', threadId: 'thread-1', runId: 'run-1', messageId: 'message-1',
  capabilityId: 'screenTime', actionType: 'open_personal_screen_time_limit',
  targetType: 'personal_screen_time_device', targetId: 'self',
  title: 'Review 10-minute app limit', consequenceSummary: 'Choose apps.',
  payload: { subject: { kind: 'self' }, limitMinutes: 10, reset: 'daily', suggestedAppLabel: 'Instagram' },
  idempotencyKey: 'key-1', status: 'presenting', result: null, errorCode: null,
  errorMessage: null, version: 2, presentedAt: '2026-09-24T12:00:00.000Z', completedAt: null,
  createdAt: '2026-09-24T12:00:00.000Z', updatedAt: '2026-09-24T12:00:00.000Z',
};

test('selects apps inline, saves the daily limit locally, and returns a token-free receipt', async () => {
  const persistSettings = jest.fn();
  const saveRule = jest.fn(async ({ rule }: { rule: PersonalCompositeScreenTimeRule }) => ({
    id: rule.id,
    targetLabels: rule.selectedApps.map((target) => target.label ?? 'Selected app'),
    conditionCount: 1,
    connector: 'all' as const,
    outcome: 'pause' as const,
    enabled: true,
    updatedAt: rule.lastUpdated!,
  }));
  const result = await executePersonalScreenTimeLimitClientAction(action, {
    readSettings: () => DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
    persistSettings,
    requestAuthorization: jest.fn(async () => 'approved'),
    presentActivityPicker: jest.fn(async (_settings, options) => {
      expect(options).toEqual({ selectionId: 'action-1' });
      return { selectedApps: [{ token: 'private-apple-token', label: 'Instagram' }], selectedCategories: [] };
    }),
    saveRule,
    now: () => '2026-09-24T12:34:56.000Z',
  });

  expect(persistSettings).toHaveBeenCalledWith(expect.objectContaining({ authorizationStatus: 'approved' }));
  expect(saveRule).toHaveBeenCalledWith(expect.objectContaining({
    expectedUpdatedAt: null,
    confirmed: true,
    rule: expect.objectContaining({
      id: 'action-1', selectionId: 'action-1', enabled: true, outcome: 'pause',
      conditions: [{ id: 'action-1:daily-usage', type: 'daily_usage', operator: 'reaches', minutes: 10 }],
      selectedApps: [{ token: 'private-apple-token', label: 'Instagram' }],
    }),
  }));
  expect(result).toEqual({
    outcome: 'created_personal_screen_time_limit', ruleId: 'action-1',
    limitMinutes: 10, targetLabels: ['Instagram'], targetCount: 1,
    updatedAt: '2026-09-24T12:34:56.000Z',
  });
  expect(JSON.stringify(result)).not.toContain('private-apple-token');
});

test('leaves the Chat action retryable when the Apple picker is dismissed', async () => {
  await expect(executePersonalScreenTimeLimitClientAction(action, {
    readSettings: () => DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
    persistSettings: jest.fn(),
    requestAuthorization: jest.fn(async () => 'approved'),
    presentActivityPicker: jest.fn(async () => null),
    saveRule: jest.fn(),
    now: () => '2026-09-24T12:34:56.000Z',
  })).rejects.toBeInstanceOf(ClientActionPresentationCancelledError);
});

test('rejects malformed or non-self personal limit actions before authorization', async () => {
  const requestAuthorization = jest.fn();
  await expect(executePersonalScreenTimeLimitClientAction({
    ...action,
    payload: { subject: { kind: 'child' }, limitMinutes: 10, reset: 'daily' },
  }, {
    readSettings: () => DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
    persistSettings: jest.fn(),
    requestAuthorization,
    presentActivityPicker: jest.fn(),
    saveRule: jest.fn(),
    now: () => '2026-09-24T12:34:56.000Z',
  })).rejects.toThrow('invalid_personal_screen_time_limit');
  expect(requestAuthorization).not.toHaveBeenCalled();
});
