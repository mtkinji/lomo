import type { ExploreData } from './types';
type Cells = ExploreData['exploredCells'];
const ids = new WeakMap<Cells, number>();
// Hints contain IDs only: retaining a new map must never retain old territory maps.
const changes = new Map<number, { parent: number; cells: readonly string[] }>();
const MAX_CHANGE_HINTS = 128;
let sequence = 0;
function identity(cells: Cells): number {
  let id = ids.get(cells);
  if (id === undefined) { id = ++sequence; ids.set(cells, id); }
  return id;
}

/** Only trusted immutable domain mutations register hints; all other callers fall back. */
export function recordExploreCellChanges(previous: Cells, next: Cells, changedIds: ReadonlySet<string>): void {
  const parent = identity(previous);
  const id = identity(next);
  changes.set(id, { parent, cells: [...changedIds] });
  if (changes.size > MAX_CHANGE_HINTS) changes.delete(changes.keys().next().value!);
}

export function changedExploreCellIds(previous: Cells, next: Cells): Set<string> | null {
  if (previous === next) return new Set();
  const target = ids.get(previous);
  let current = ids.get(next);
  if (target === undefined || current === undefined) return null;
  const result = new Set<string>();
  for (let depth = 0; depth < MAX_CHANGE_HINTS; depth++) {
    const change = changes.get(current);
    if (!change) return null;
    change.cells.forEach(id => result.add(id));
    current = change.parent;
    if (current === target) return result;
  }
  return null;
}
