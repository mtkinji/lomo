export async function collectAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize = 1000,
  concurrency = 1,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize <= 0) throw new Error('pageSize must be a positive integer');
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 3) throw new Error('concurrency must be between 1 and 3');
  const first = await fetchPage(0, pageSize - 1);
  const rows = [...first];
  if (first.length < pageSize) return rows;
  for (let from = pageSize; ; from += pageSize * concurrency) {
    const batch = await Promise.allSettled(Array.from({ length: concurrency }, (_, index) => {
      const start = from + index * pageSize;
      return Promise.resolve().then(() => fetchPage(start, start + pageSize - 1));
    }));
    // Interpret in page order: later speculative requests cannot invalidate an
    // already complete history, but a failed required page must never truncate it.
    for (const result of batch) {
      if (result.status === 'rejected') throw result.reason;
      rows.push(...result.value);
      if (result.value.length < pageSize) return rows;
    }
  }
}
