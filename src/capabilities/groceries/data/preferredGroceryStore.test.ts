import AsyncStorage from '@react-native-async-storage/async-storage';

import { preferredGroceryStore } from './preferredGroceryStore';

describe('preferredGroceryStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('keeps each person’s preferred store separate', async () => {
    const store = {
      id: 'store-1',
      name: "Smith's Marketplace",
      banner: "Smith's",
      address: '689 N Redwood Rd · Saratoga Springs, UT 84045',
      latitude: 40.34,
      longitude: -111.91,
    };

    await preferredGroceryStore.write('person-1', store);

    await expect(preferredGroceryStore.read('person-1')).resolves.toEqual(store);
    await expect(preferredGroceryStore.read('person-2')).resolves.toBeNull();
  });

  it('ignores malformed persisted data', async () => {
    await AsyncStorage.setItem('kwilt-groceries-preferred-store-v1:person-1', '{nope');
    await expect(preferredGroceryStore.read('person-1')).resolves.toBeNull();
  });

  it('can forget a preferred store without affecting another person', async () => {
    const store = {
      id: 'store-1',
      name: "Smith's Marketplace",
      banner: "Smith's",
      address: '689 N Redwood Rd · Saratoga Springs, UT 84045',
      latitude: 40.34,
      longitude: -111.91,
    };
    await preferredGroceryStore.write('person-1', store);
    await preferredGroceryStore.write('person-2', store);

    await preferredGroceryStore.clear('person-1');

    await expect(preferredGroceryStore.read('person-1')).resolves.toBeNull();
    await expect(preferredGroceryStore.read('person-2')).resolves.toEqual(store);
  });
});
