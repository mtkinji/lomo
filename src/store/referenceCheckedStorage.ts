import type { PersistStorage, StorageValue } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';

/** Skip serialization only when immutable persisted fields and version are unchanged. */
export function referenceCheckedStorage<T>(storage: PersistStorage<T>): PersistStorage<T> {
  const writes = new Map<string, { value: StorageValue<T>; result: Promise<unknown> }>();
  return {
    getItem: (name) => {
      writes.delete(name);
      return storage.getItem(name);
    },
    setItem: (name, value) => {
      const previous = writes.get(name);
      if (previous && previous.value.version === value.version && shallow(previous.value.state, value.state)) {
        return previous.result;
      }
      // Call synchronously to preserve the underlying adapter's write ordering.
      const result = Promise.resolve(storage.setItem(name, value));
      const entry = { value, result };
      writes.set(name, entry);
      void result.catch(() => {
        // A failed write must be retryable, without invalidating a newer write.
        if (writes.get(name) === entry) writes.delete(name);
      });
      return result;
    },
    removeItem: (name) => {
      writes.delete(name);
      return storage.removeItem(name);
    },
  };
}
