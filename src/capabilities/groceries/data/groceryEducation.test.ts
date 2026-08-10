import AsyncStorage from '@react-native-async-storage/async-storage';

import { groceryEducation } from './groceryEducation';

describe('groceryEducation', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('remembers the already-have coachmark separately for each person', async () => {
    await expect(groceryEducation.hasSeenAlreadyHave('person-1')).resolves.toBe(false);

    await groceryEducation.markAlreadyHaveSeen('person-1');

    await expect(groceryEducation.hasSeenAlreadyHave('person-1')).resolves.toBe(true);
    await expect(groceryEducation.hasSeenAlreadyHave('person-2')).resolves.toBe(false);
  });

  it('uses a device-scoped fallback before sign-in', async () => {
    await groceryEducation.markAlreadyHaveSeen(null);

    await expect(groceryEducation.hasSeenAlreadyHave(null)).resolves.toBe(true);
    await expect(groceryEducation.hasSeenAlreadyHave('person-1')).resolves.toBe(false);
  });

  it('remembers when a person has initiated the online cart flow', async () => {
    await expect(groceryEducation.hasStartedCartFlow('person-1')).resolves.toBe(false);

    await groceryEducation.markCartFlowStarted('person-1');

    await expect(groceryEducation.hasStartedCartFlow('person-1')).resolves.toBe(true);
    await expect(groceryEducation.hasStartedCartFlow('person-2')).resolves.toBe(false);
  });
});
