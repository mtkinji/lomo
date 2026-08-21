import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  acknowledgeMoneyOnboardingBudgetGuide,
  acknowledgeMoneyOnboardingFollowThroughGuide,
  completeMoneyOnboarding,
  loadMoneyOnboardingState,
  recordMoneyOnboardingHandoff,
  recordMoneyOnboardingIntroduction,
  recordMoneyOnboardingCheckpoint,
  recordMoneyOnboardingDecision,
} from './moneyOnboardingStorage';

describe('Money onboarding storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('scopes completion to the signed-in user', async () => {
    await completeMoneyOnboarding('user-a', {
      livingPercent: 70,
      provenance: 'onboarding',
      updatedAtIso: '2026-07-24T12:00:00.000Z',
    }, { skippedAccountConnection: true, completedAtIso: '2026-07-24T12:01:00.000Z' });

    expect(await loadMoneyOnboardingState('user-a')).toMatchObject({
      completedAt: '2026-07-24T12:01:00.000Z',
      skippedAccountConnectionAt: '2026-07-24T12:01:00.000Z',
      target: { livingPercent: 70 },
    });
    expect(await loadMoneyOnboardingState('user-b')).toEqual({
      schemaVersion: 2,
      introductionSeenAt: null,
      checkpoint: null,
      coverageConfidence: null,
      planningIntent: null,
      completedAt: null,
      target: null,
      skippedAccountConnectionAt: null,
      requestedPlace: null,
      handoff: null,
    });
  });

  it('treats malformed persisted state as empty', async () => {
    await AsyncStorage.setItem('kwilt:money:onboarding:v1:user-a', '{bad');
    expect(await loadMoneyOnboardingState('user-a')).toEqual({
      schemaVersion: 2,
      introductionSeenAt: null,
      checkpoint: null,
      coverageConfidence: null,
      planningIntent: null,
      completedAt: null,
      target: null,
      skippedAccountConnectionAt: null,
      requestedPlace: null,
      handoff: null,
    });
  });

  it('records an introduction without claiming foundation completion', async () => {
    await recordMoneyOnboardingIntroduction(
      'user-a',
      'MoneyAccounts',
      '2026-08-20T12:00:00.000Z',
    );

    expect(await loadMoneyOnboardingState('user-a')).toMatchObject({
      schemaVersion: 2,
      introductionSeenAt: '2026-08-20T12:00:00.000Z',
      completedAt: null,
      requestedPlace: 'MoneyAccounts',
    });
  });

  it('migrates legacy completion without replaying first-use introduction', async () => {
    await AsyncStorage.setItem('kwilt:money:onboarding:v1:user-a', JSON.stringify({
      completedAt: '2026-07-24T12:01:00.000Z',
      target: {
        livingPercent: 70,
        provenance: 'onboarding',
        updatedAtIso: '2026-07-24T12:00:00.000Z',
      },
      skippedAccountConnectionAt: null,
    }));

    expect(await loadMoneyOnboardingState('user-a')).toMatchObject({
      schemaVersion: 2,
      introductionSeenAt: '2026-07-24T12:01:00.000Z',
      completedAt: '2026-07-24T12:01:00.000Z',
      requestedPlace: null,
    });
  });

  it('persists and clears an interrupted setup checkpoint', async () => {
    await recordMoneyOnboardingIntroduction('user-a', 'MoneyAccounts', '2026-08-20T12:00:00.000Z');
    await recordMoneyOnboardingCheckpoint('user-a', 'MoneyAccounts', 'account');
    expect(await loadMoneyOnboardingState('user-a')).toMatchObject({ checkpoint: 'account' });
    await recordMoneyOnboardingCheckpoint('user-a', 'MoneyAccounts', 'intent');
    expect(await loadMoneyOnboardingState('user-a')).toMatchObject({ checkpoint: 'intent' });
    await recordMoneyOnboardingCheckpoint('user-a', 'MoneyAccounts', 'target');
    expect(await loadMoneyOnboardingState('user-a')).toMatchObject({ checkpoint: 'target' });
    await recordMoneyOnboardingCheckpoint('user-a', 'MoneyAccounts', null);
    expect(await loadMoneyOnboardingState('user-a')).toMatchObject({ checkpoint: null });
  });

  it('persists account-coverage truth and planning intent for interruption-safe resume', async () => {
    await recordMoneyOnboardingDecision('user-a', 'MoneySummary', {
      coverageConfidence: 'partial',
      planningIntent: 'reduce',
    });

    expect(await loadMoneyOnboardingState('user-a')).toMatchObject({
      requestedPlace: 'MoneySummary',
      coverageConfidence: 'partial',
      planningIntent: 'reduce',
    });
  });

  it('persists the staged Budget and follow-through handoff for later visits', async () => {
    await recordMoneyOnboardingHandoff('user-a', {
      createdAtIso: '2026-08-21T18:00:00.000Z',
      selectedPlanCents: 617_500,
      goalId: 'goal-money-onboarding-spend-less-v1',
      goalTitle: 'Spend $205 less each month',
      savingsCents: 20_500,
      todoCount: 2,
    });

    expect((await loadMoneyOnboardingState('user-a')).handoff).toMatchObject({
      selectedPlanCents: 617_500,
      goalTitle: 'Spend $205 less each month',
      budgetGuideAcknowledgedAt: null,
      followThroughGuideAcknowledgedAt: null,
    });

    await acknowledgeMoneyOnboardingBudgetGuide('user-a', '2026-08-21T18:01:00.000Z');
    expect((await loadMoneyOnboardingState('user-a')).handoff).toMatchObject({
      budgetGuideAcknowledgedAt: '2026-08-21T18:01:00.000Z',
      followThroughGuideAcknowledgedAt: null,
    });

    await acknowledgeMoneyOnboardingFollowThroughGuide('user-a', '2026-08-21T18:02:00.000Z');
    expect((await loadMoneyOnboardingState('user-a')).handoff).toMatchObject({
      followThroughGuideAcknowledgedAt: '2026-08-21T18:02:00.000Z',
    });
  });
});
