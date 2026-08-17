import { createOnDeviceGenerationPolicy } from './onDeviceGenerationPolicy';

function makeStorage(initial: string | null = null) {
  let stored = initial;
  return {
    getItem: jest.fn(async () => stored),
    setItem: jest.fn(async (_key: string, value: string) => {
      stored = value;
    }),
  };
}

describe('on-device generation policy', () => {
  test('preserves bundled promotion when remote config is missing', async () => {
    const policy = createOnDeviceGenerationPolicy({
      storage: makeStorage(),
      flags: { getFeatureFlag: jest.fn(() => undefined) },
    });

    await expect(policy.resolve('chat_rewrite', 'default')).resolves.toBe('default');
    await expect(policy.resolve('chat_shorten', 'challenger')).resolves.toBe('challenger');
  });

  test('an explicit remote false demotes a default cohort and caches the rollback', async () => {
    const storage = makeStorage();
    const flags = { getFeatureFlag: jest.fn(() => false as boolean | undefined) };
    const policy = createOnDeviceGenerationPolicy({ storage, flags });

    await expect(policy.resolve('chat_rewrite', 'default')).resolves.toBe('disabled');
    expect(storage.setItem).toHaveBeenCalledWith(
      'kwilt:on-device-generation-policy:v1',
      JSON.stringify({ disabledJobs: ['chat_rewrite'] }),
    );

    flags.getFeatureFlag.mockReturnValue(undefined);
    const relaunchedPolicy = createOnDeviceGenerationPolicy({ storage, flags });
    await expect(relaunchedPolicy.resolve('chat_rewrite', 'default')).resolves.toBe('disabled');
  });

  test('remote true may clear a cached demotion but never promotes a bundled challenger', async () => {
    const storage = makeStorage(JSON.stringify({ disabledJobs: ['chat_rewrite', 'chat_shorten'] }));
    const flags = { getFeatureFlag: jest.fn(() => true as boolean | undefined) };
    const policy = createOnDeviceGenerationPolicy({ storage, flags });

    await expect(policy.resolve('chat_rewrite', 'default')).resolves.toBe('default');
    await expect(policy.resolve('chat_shorten', 'challenger')).resolves.toBe('challenger');
  });

  test('ignores malformed cached state and non-boolean remote variants', async () => {
    const policy = createOnDeviceGenerationPolicy({
      storage: makeStorage('{bad json'),
      flags: { getFeatureFlag: jest.fn(() => 'experiment') },
    });

    await expect(policy.resolve('chat_summarize', 'default')).resolves.toBe('default');
  });
});
