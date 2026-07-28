import {
  hasAnySyncedData,
  probeReturningUserWithRetry,
  type SyncedDataProbeResult,
} from './returningUserProbe';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

describe('returning user probe', () => {
  it('starts every table probe concurrently and detects data from any table', async () => {
    const arcs = deferred<SyncedDataProbeResult>();
    const goals = deferred<SyncedDataProbeResult>();
    const activities = deferred<SyncedDataProbeResult>();
    const started: string[] = [];

    const result = hasAnySyncedData([
      () => {
        started.push('arcs');
        return arcs.promise;
      },
      () => {
        started.push('goals');
        return goals.promise;
      },
      () => {
        started.push('activities');
        return activities.promise;
      },
    ]);

    expect(started).toEqual(['arcs', 'goals', 'activities']);

    arcs.resolve({ data: [], error: null });
    goals.resolve({ data: null, error: { message: 'temporary failure' } });
    activities.resolve({ data: [{ id: 'activity-1' }], error: null });

    await expect(result).resolves.toBe(true);
  });

  it('returns false when every successful table probe is empty', async () => {
    await expect(
      hasAnySyncedData([
        async () => ({ data: [], error: null }),
        async () => ({ data: null, error: { message: 'temporary failure' } }),
        async () => ({ data: [], error: null }),
      ]),
    ).resolves.toBe(false);
  });

  it('resolves as soon as one table proves the user has synced data', async () => {
    const arcs = deferred<SyncedDataProbeResult>();
    const goals = deferred<SyncedDataProbeResult>();
    const activities = deferred<SyncedDataProbeResult>();

    const result = hasAnySyncedData([
      () => arcs.promise,
      () => goals.promise,
      () => activities.promise,
    ]);

    arcs.resolve({ data: [{ id: 'arc-1' }], error: null });

    await expect(
      Promise.race([
        result,
        new Promise<'still-waiting'>((resolve) => setTimeout(() => resolve('still-waiting'), 0)),
      ]),
    ).resolves.toBe(true);
  });

  it('retries three times but waits only between attempts', async () => {
    const probe = jest.fn().mockResolvedValue(false);
    const wait = jest.fn().mockResolvedValue(undefined);

    await expect(probeReturningUserWithRetry(probe, wait)).resolves.toBe(false);

    expect(probe).toHaveBeenCalledTimes(3);
    expect(wait.mock.calls).toEqual([[250], [500]]);
  });

  it('returns immediately after the first successful attempt', async () => {
    const probe = jest.fn().mockResolvedValue(true);
    const wait = jest.fn().mockResolvedValue(undefined);

    await expect(probeReturningUserWithRetry(probe, wait)).resolves.toBe(true);

    expect(probe).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });
});
