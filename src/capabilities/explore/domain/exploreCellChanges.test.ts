import { changedExploreCellIds, recordExploreCellChanges } from './exploreCellChanges';
import type { ExploreData } from './types';
type Cells = ExploreData['exploredCells'];
it('accumulates skipped mutations without confusing branches or unknown replacements', () => {
  const base: Cells = {}, first: Cells = {}, second: Cells = {}, branch: Cells = {};
  recordExploreCellChanges(base, first, new Set(['a']));
  recordExploreCellChanges(first, second, new Set(['b', 'a']));
  recordExploreCellChanges(base, branch, new Set(['c']));
  expect(changedExploreCellIds(base, second)).toEqual(new Set(['a', 'b']));
  expect(changedExploreCellIds(first, second)).toEqual(new Set(['a', 'b']));
  expect(changedExploreCellIds(first, branch)).toBeNull();
  expect(changedExploreCellIds(base, {})).toBeNull();
});
it('falls back after bounded hint retention rather than retaining old territory graphs', () => {
  const base: Cells = {};
  let latest = base;
  for (let index = 0; index < 150; index++) {
    const next: Cells = {};
    recordExploreCellChanges(latest, next, new Set([String(index)]));
    latest = next;
  }
  expect(changedExploreCellIds(base, latest)).toBeNull();
});
