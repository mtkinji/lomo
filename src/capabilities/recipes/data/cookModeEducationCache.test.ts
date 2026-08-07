import { createCookModeEducationCache } from './cookModeEducationCache';

describe('cookModeEducationCache', () => {
  it('keeps the hands-free lesson visible until it is explicitly acknowledged', async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: jest.fn(async (key: string) => values.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => { values.set(key, value); }),
    };
    const cache = createCookModeEducationCache(storage);

    await expect(cache.hasAcknowledgedVoiceGuide()).resolves.toBe(false);
    await cache.acknowledgeVoiceGuide();
    await expect(cache.hasAcknowledgedVoiceGuide()).resolves.toBe(true);
  });

  it('does not treat an unknown stored value as acknowledgement', async () => {
    const cache = createCookModeEducationCache({
      getItem: jest.fn(async () => 'opened'),
      setItem: jest.fn(async () => undefined),
    });

    await expect(cache.hasAcknowledgedVoiceGuide()).resolves.toBe(false);
  });

  it('keeps the lesson available when local storage cannot be read', async () => {
    const cache = createCookModeEducationCache({
      getItem: jest.fn(async () => { throw new Error('storage unavailable'); }),
      setItem: jest.fn(async () => undefined),
    });

    await expect(cache.hasAcknowledgedVoiceGuide()).resolves.toBe(false);
  });
});
