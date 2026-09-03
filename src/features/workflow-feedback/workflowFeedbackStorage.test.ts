import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createEmptyWorkflowFeedbackState,
  loadWorkflowFeedbackState,
  recordWorkflowFeedbackDismissed,
  recordWorkflowFeedbackEncounter,
  recordWorkflowFeedbackShown,
  recordWorkflowFeedbackSubmitted,
  workflowFeedbackStorageKey,
} from './workflowFeedbackStorage';

const userA = { kind: 'user', id: 'user/a' } as const;
const userB = { kind: 'user', id: 'user/b' } as const;
const install = { kind: 'install', id: 'install one' } as const;
const promptKey = 'money_rebalance_satisfaction_v1:v1';

describe('workflow feedback storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('isolates authenticated and anonymous namespaces', () => {
    expect(workflowFeedbackStorageKey(userA)).toBe('workflow-feedback:v1:user:user%2Fa');
    expect(workflowFeedbackStorageKey(userB)).toBe('workflow-feedback:v1:user:user%2Fb');
    expect(workflowFeedbackStorageKey(install)).toBe('workflow-feedback:v1:install:install%20one');
  });

  it('recovers safely from invalid JSON and future schemas', async () => {
    await AsyncStorage.setItem(workflowFeedbackStorageKey(userA), '{bad-json');
    await expect(loadWorkflowFeedbackState(userA)).resolves.toEqual(createEmptyWorkflowFeedbackState());

    await AsyncStorage.setItem(workflowFeedbackStorageKey(userA), JSON.stringify({ schemaVersion: 2 }));
    await expect(loadWorkflowFeedbackState(userA)).resolves.toEqual(createEmptyWorkflowFeedbackState());
  });

  it('persists only suppression metadata', async () => {
    await recordWorkflowFeedbackEncounter(userA, promptKey);
    await recordWorkflowFeedbackShown(userA, '2026-09-02T18:00:00.000Z');
    await recordWorkflowFeedbackSubmitted(userA, promptKey, '2026-09-02T18:01:00.000Z');

    const serialized = await AsyncStorage.getItem(workflowFeedbackStorageKey(userA));
    expect(serialized).not.toBeNull();
    expect(serialized).not.toMatch(/response|reason|feedback_instance_id|sourceKey|How satisfied/i);
    expect(JSON.parse(serialized!)).toEqual(expect.objectContaining({
      schemaVersion: 1,
      unresolvedExposure: false,
      lastSubmittedAt: '2026-09-02T18:01:00.000Z',
      prompts: { [promptKey]: { encounterCount: 1, lastTerminalAt: '2026-09-02T18:01:00.000Z' } },
    }));
  });

  it('keeps an interrupted shown exposure unresolved across loads', async () => {
    await recordWorkflowFeedbackEncounter(userA, promptKey);
    await recordWorkflowFeedbackShown(userA, '2026-09-02T18:00:00.000Z');
    await expect(loadWorkflowFeedbackState(userA)).resolves.toMatchObject({
      lastShownAt: '2026-09-02T18:00:00.000Z',
      unresolvedExposure: true,
    });

    await recordWorkflowFeedbackDismissed(userA, promptKey, '2026-09-02T18:02:00.000Z');
    await expect(loadWorkflowFeedbackState(userA)).resolves.toMatchObject({
      unresolvedExposure: false,
      lastDismissedAt: '2026-09-02T18:02:00.000Z',
    });
  });
});
