/** Keep bank work bounded, settle every connection, and retain deterministic receipts. */
export async function syncPlaidConnectionBatch<T>(
  ids: string[],
  sync: (id: string) => Promise<T>,
): Promise<T[]> {
  const results: T[] = new Array(ids.length);
  const failures: { index: number; error: unknown }[] = [];
  let next = 0;
  async function worker() {
    while (next < ids.length) {
      const index = next++;
      try {
        results[index] = await sync(ids[index]);
      } catch (error) {
        failures.push({ index, error });
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(2, ids.length) }, () => worker()),
  );
  if (failures.length) {
    throw failures.sort((a, b) => a.index - b.index)[0].error;
  }
  return results;
}

/** Bank I/O may overlap; shared household foundation writes must not. */
export function createSerialTaskRunner() {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>): Promise<T> => {
    const result = tail.then(task);
    tail = result.catch(() => undefined);
    return result;
  };
}
