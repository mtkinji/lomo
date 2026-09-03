import { PostHogPersistedProperty } from 'posthog-react-native';
import { createAnalyticsConsentRuntime } from './analyticsConsentRuntime';

function client() {
  return {
    optIn: jest.fn(async () => undefined),
    optOut: jest.fn(async () => undefined),
    reset: jest.fn(),
    ready: jest.fn(async () => undefined),
    setPersistedProperty: jest.fn(),
  };
}

describe('analytics consent runtime', () => {
  it('does not construct a client while consent is off', async () => {
    const createClient = jest.fn(client);
    const runtime = createAnalyticsConsentRuntime(createClient);

    await runtime.apply(false);

    expect(createClient).not.toHaveBeenCalled();
    expect(runtime.getClient()).toBeUndefined();
  });

  it('constructs and opts in only after consent is granted', async () => {
    const next = client();
    const runtime = createAnalyticsConsentRuntime(() => next);

    await runtime.apply(true);

    expect(next.optIn).toHaveBeenCalledTimes(1);
    expect(runtime.getClient()).toBe(next);
  });

  it('stops access immediately, clears queued events, resets identity, and opts out on withdrawal', async () => {
    const next = client();
    const runtime = createAnalyticsConsentRuntime(() => next);
    await runtime.apply(true);

    const withdrawal = runtime.apply(false);
    expect(runtime.getClient()).toBeUndefined();
    await withdrawal;

    expect(next.setPersistedProperty).toHaveBeenCalledWith(PostHogPersistedProperty.Queue, null);
    expect(next.setPersistedProperty).toHaveBeenCalledWith(PostHogPersistedProperty.AiQueue, null);
    expect(next.setPersistedProperty).toHaveBeenCalledWith(PostHogPersistedProperty.LogsQueue, null);
    expect(next.reset).toHaveBeenCalledTimes(1);
    expect(next.optOut).toHaveBeenCalledTimes(1);
  });

  it('opts out a client when consent is withdrawn while initialization is still pending', async () => {
    let finishReady: (() => void) | undefined;
    const next = client();
    const ready = new Promise<void>((resolve) => { finishReady = resolve; });
    next.ready.mockImplementation(async () => {
      await ready;
      return undefined;
    });
    const runtime = createAnalyticsConsentRuntime(() => next);

    const grant = runtime.apply(true);
    const withdrawal = runtime.apply(false);
    finishReady?.();
    await Promise.all([grant, withdrawal]);

    expect(runtime.getClient()).toBeUndefined();
    expect(next.optOut).toHaveBeenCalledTimes(1);
  });
});
