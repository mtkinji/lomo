import { createCatalogMediaCache } from './catalogMediaCache';

const overlay = {
  rosterId: 'BR012',
  media: {
    id: 'media-1', ownerPersonId: 'owner', storageRef: 'https://cdn.example.com/br012.webp',
    mediaType: 'image/webp', rightsBasis: 'kwilt_authored' as const, attribution: null,
    altText: 'Chilaquiles rojos.', publicAllowed: true, lifecycle: 'active' as const,
  },
};

describe('catalog media cache', () => {
  it('keeps the last-known-good overlay when a refresh is empty', async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: jest.fn(async (key: string) => values.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => { values.set(key, value); }),
      removeItem: jest.fn(async (key: string) => { values.delete(key); }),
    };
    const cache = createCatalogMediaCache(storage);
    await cache.write('user-1', [overlay]);
    await cache.write('user-1', []);
    expect(await cache.read('user-1')).toEqual([overlay]);
  });
});
