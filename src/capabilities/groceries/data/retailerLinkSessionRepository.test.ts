import AsyncStorage from '@react-native-async-storage/async-storage';

import { createRetailerLinkSession } from '../domain/retailerLinkSession';
import {
  createRetailerLinkSessionRepository,
  retailerLinkSessionStorageKey,
} from './retailerLinkSessionRepository';

describe('retailer link session repository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('stores sessions by person, list, and retailer', async () => {
    const repository = createRetailerLinkSessionRepository(AsyncStorage);
    const session = createRetailerLinkSession({
      listId: 'list-1',
      listRevision: 4,
      retailerId: 'amazon',
      updatedAt: '2026-08-14T16:00:00.000Z',
    });
    await repository.replace('person-1', session);

    await expect(repository.read('person-1', 'list-1', 'amazon')).resolves.toEqual(session);
    await expect(repository.read('person-1', 'list-1', 'walmart')).resolves.toBeNull();
  });

  it('removes corrupt persisted state', async () => {
    const repository = createRetailerLinkSessionRepository(AsyncStorage);
    const key = retailerLinkSessionStorageKey('person-1', 'list-1', 'amazon');
    await AsyncStorage.setItem(key, '{nope');

    await expect(repository.read('person-1', 'list-1', 'amazon')).resolves.toBeNull();
    await expect(AsyncStorage.getItem(key)).resolves.toBeNull();
  });
});
