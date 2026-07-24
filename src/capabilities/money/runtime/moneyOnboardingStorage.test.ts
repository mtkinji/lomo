import AsyncStorage from '@react-native-async-storage/async-storage';
import { completeMoneyOnboarding, loadMoneyOnboardingState } from './moneyOnboardingStorage';

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
      completedAt: null,
      target: null,
      skippedAccountConnectionAt: null,
    });
  });

  it('treats malformed persisted state as empty', async () => {
    await AsyncStorage.setItem('kwilt:money:onboarding:v1:user-a', '{bad');
    expect(await loadMoneyOnboardingState('user-a')).toEqual({
      completedAt: null,
      target: null,
      skippedAccountConnectionAt: null,
    });
  });
});
