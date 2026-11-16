import type { QueuedGroceryItemState } from './groceryOfflineQueue';
type State = QueuedGroceryItemState['state'];
type Write = Pick<QueuedGroceryItemState, 'queuedAt' | 'state'>;

/** Keep rollback local to an item and to its last successfully persisted intent. */
export function createGroceryCheckTracker() {
  const items = new Map<string, { persisted: State; writes: Write[] }>();
  return {
    begin(key: string, baseline: State, write: Write) {
      const item = items.get(key) ?? { persisted: baseline, writes: [] };
      item.writes.push(write);
      items.set(key, item);
    },
    settle(key: string, queuedAt: string, persisted: boolean): State | null {
      const item = items.get(key);
      const write = item?.writes.find((candidate) => candidate.queuedAt === queuedAt);
      if (!item || !write) return null;
      if (persisted) item.persisted = write.state;
      item.writes = item.writes.filter((candidate) => candidate !== write);
      const state = item.writes.at(-1)?.state ?? item.persisted;
      if (!item.writes.length) items.delete(key);
      return state;
    },
  };
}
