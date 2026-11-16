/** Share pending reads only while no confirmed mutation has invalidated them. */
export function createMoneySnapshotRequests<T>(load: () => Promise<T>) {
  let pending: { version: number; promise: Promise<T> } | null = null;

  return {
    read(version: number): Promise<T> {
      if (pending?.version === version) return pending.promise;
      const promise = load().finally(() => {
        // A superseded read must not evict the current generation's request.
        if (pending?.promise === promise) pending = null;
      });
      pending = { version, promise };
      return promise;
    },
  };
}
