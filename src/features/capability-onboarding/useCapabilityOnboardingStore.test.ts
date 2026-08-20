import AsyncStorage from '@react-native-async-storage/async-storage';

import { createCapabilityOnboardingRecord } from './capabilityOnboardingState';
import {
  CAPABILITY_ONBOARDING_STORAGE_KEY,
  useCapabilityOnboardingStore,
} from './useCapabilityOnboardingStore';

describe('useCapabilityOnboardingStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useCapabilityOnboardingStore.setState({ recordsByUserId: {}, hydrated: true });
  });

  it('keeps onboarding records isolated by authenticated user id', () => {
    useCapabilityOnboardingStore.getState().dispatch('user-a', {
      type: 'select-path',
      pathId: 'make-meals-easier',
      now: 10,
    });
    useCapabilityOnboardingStore.getState().dispatch('user-a', {
      type: 'checkpoint',
      checkpoint: 'food:ingredients',
      now: 20,
    });

    expect(useCapabilityOnboardingStore.getState().recordForUser('user-a')).toMatchObject({
      selectedPathId: 'make-meals-easier',
      checkpoint: 'food:ingredients',
    });
    expect(useCapabilityOnboardingStore.getState().recordForUser('user-b')).toEqual(
      createCapabilityOnboardingRecord(),
    );
  });

  it('normalizes and restores a persisted checkpoint during hydration', async () => {
    useCapabilityOnboardingStore.setState({ recordsByUserId: {}, hydrated: false });
    await AsyncStorage.setItem(
      CAPABILITY_ONBOARDING_STORAGE_KEY,
      JSON.stringify({
        state: {
          recordsByUserId: {
            'user-a': {
              ...createCapabilityOnboardingRecord(),
              universalState: 'chosen',
              selectedPathId: 'make-meals-easier',
              checkpoint: 'food:cook',
              pathCheckpoints: { 'make-meals-easier': 'food:cook' },
              updatedAt: 30,
            },
          },
        },
        version: 0,
      }),
    );

    await useCapabilityOnboardingStore.persist.rehydrate();

    expect(useCapabilityOnboardingStore.getState().hydrated).toBe(true);
    expect(useCapabilityOnboardingStore.getState().recordForUser('user-a').checkpoint).toBe(
      'food:cook',
    );
  });

  it('resets only the requested user', () => {
    for (const userId of ['user-a', 'user-b']) {
      useCapabilityOnboardingStore.getState().dispatch(userId, {
        type: 'select-path',
        pathId: 'make-meals-easier',
        now: 10,
      });
    }

    useCapabilityOnboardingStore.getState().resetUser('user-a');

    expect(useCapabilityOnboardingStore.getState().recordForUser('user-a')).toEqual(
      createCapabilityOnboardingRecord(),
    );
    expect(useCapabilityOnboardingStore.getState().recordForUser('user-b').selectedPathId).toBe(
      'make-meals-easier',
    );
  });
});
