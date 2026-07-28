export type SyncedDataProbeResult = {
  data: Array<{ id: string }> | null;
  error: unknown | null;
};

type SyncedDataProbe = () => PromiseLike<SyncedDataProbeResult>;
type Wait = (delayMs: number) => Promise<void>;

const DEFAULT_ATTEMPTS = 3;

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function hasAnySyncedData(probes: readonly SyncedDataProbe[]): Promise<boolean> {
  if (probes.length === 0) return false;

  return new Promise((resolve) => {
    let remaining = probes.length;
    let settled = false;

    const finishWithoutData = () => {
      remaining -= 1;
      if (!settled && remaining === 0) {
        settled = true;
        resolve(false);
      }
    };

    probes.forEach((probe) => {
      let result: PromiseLike<SyncedDataProbeResult>;
      try {
        result = probe();
      } catch {
        finishWithoutData();
        return;
      }
      Promise.resolve(result)
        .then(({ data, error }) => {
          if (!settled && !error && Array.isArray(data) && data.length > 0) {
            settled = true;
            resolve(true);
            return;
          }
          finishWithoutData();
        })
        .catch(finishWithoutData);
    });
  });
}

export async function probeReturningUserWithRetry(
  probe: () => Promise<boolean>,
  waitForDelay: Wait = wait,
): Promise<boolean> {
  for (let attempt = 0; attempt < DEFAULT_ATTEMPTS; attempt += 1) {
    if (await probe()) return true;
    if (attempt < DEFAULT_ATTEMPTS - 1) {
      await waitForDelay(250 * (attempt + 1));
    }
  }
  return false;
}
