import AsyncStorage from '@react-native-async-storage/async-storage';

import { retailerStoreConfirmation } from './retailerStoreConfirmation';

const saratogaSprings = {
  id: '70600207',
  name: "Smith's Marketplace",
  banner: "Smith's",
  address: '689 N Redwood Rd · Saratoga Springs, UT 84045',
  latitude: 40.34,
  longitude: -111.91,
};

describe('retailerStoreConfirmation', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns a user-confirmed receipt only for the exact selected store', async () => {
    const receipt = await retailerStoreConfirmation.confirm('person-1', saratogaSprings);

    await expect(retailerStoreConfirmation.read('person-1', saratogaSprings)).resolves.toEqual(receipt);
    await expect(retailerStoreConfirmation.read('person-1', {
      ...saratogaSprings,
      id: '70100860',
      address: '500 W University Dr · Orem, UT 84058',
    })).resolves.toBeNull();
    await expect(retailerStoreConfirmation.read('person-2', saratogaSprings)).resolves.toBeNull();
  });

  it('replaces the prior pairing when another store is confirmed', async () => {
    await retailerStoreConfirmation.confirm('person-1', saratogaSprings);
    const seattle = {
      ...saratogaSprings,
      id: '70100861',
      name: 'QFC University Village',
      banner: 'QFC',
      address: '2746 NE 45th St · Seattle, WA 98105',
    };

    await retailerStoreConfirmation.confirm('person-1', seattle);

    await expect(retailerStoreConfirmation.read('person-1', saratogaSprings)).resolves.toBeNull();
    await expect(retailerStoreConfirmation.read('person-1', seattle)).resolves.toMatchObject({
      provider: 'kroger',
      locationId: seattle.id,
      retailerLabel: 'QFC',
      address: seattle.address,
      authority: 'user_confirmed',
    });
  });

  it('ignores malformed persisted confirmation data', async () => {
    await AsyncStorage.setItem(
      'kwilt-groceries-retailer-store-confirmation-v1:person-1:kroger',
      '{not-json',
    );

    await expect(retailerStoreConfirmation.read('person-1', saratogaSprings)).resolves.toBeNull();
  });
});
