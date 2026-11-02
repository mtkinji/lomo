import { runWithPlanningBudget } from './planningBudget';

describe('Unified Chat planning budget', () => {
  test('keeps the timeout fallback when the request resolves during abort', async () => {
    jest.useFakeTimers();
    try {
      const result = runWithPlanningBudget(
        (signal) => new Promise<string>((resolve) => {
          signal.addEventListener('abort', () => resolve('aborted request result'), { once: true });
        }),
        { timeoutMs: 10, fallback: 'budget exhausted' },
      );
      await jest.advanceTimersByTimeAsync(10);
      await expect(result).resolves.toBe('budget exhausted');
    } finally {
      jest.useRealTimers();
    }
  });

  test('preserves parent cancellation when the request resolves during abort', async () => {
    const parent = new AbortController();
    const result = runWithPlanningBudget(
      (signal) => new Promise<string>((resolve) => {
        signal.addEventListener('abort', () => resolve('aborted request result'), { once: true });
      }),
      { timeoutMs: 1_000, fallback: null, parentSignal: parent.signal },
    );
    parent.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });

  test('aborts a stalled planning request and returns the fallback value', async () => {
    let requestWasAborted = false;

    const result = await runWithPlanningBudget(
      (signal) => new Promise<string>(() => {
        signal.addEventListener('abort', () => {
          requestWasAborted = true;
        }, { once: true });
      }),
      { timeoutMs: 10, fallback: null },
    );

    expect(result).toBeNull();
    expect(requestWasAborted).toBe(true);
  });

  test('preserves a successful result inside the budget', async () => {
    await expect(runWithPlanningBudget(
      async () => 'planned',
      { timeoutMs: 50, fallback: null },
    )).resolves.toBe('planned');
  });

  test('stops immediately when the parent turn is aborted even if the request ignores its signal', async () => {
    const parent = new AbortController();
    const result = runWithPlanningBudget(
      () => new Promise<string>(() => undefined),
      { timeoutMs: 1_000, fallback: null, parentSignal: parent.signal },
    );

    parent.abort();

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });
});
