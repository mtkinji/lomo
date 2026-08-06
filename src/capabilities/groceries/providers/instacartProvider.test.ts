import { buildInstacartHandoffRequest, describeInstacartResult } from './instacartProvider';

describe('Instacart provider', () => {
  it('keys handoff to immutable list revision while keeping review explicit', () => {
    expect(buildInstacartHandoffRequest('list-1', 3)).toEqual({ groceryListId: 'list-1', expectedRevision: 3, provider: 'instacart' });
    expect(describeInstacartResult({ matched: 7, unmatched: 2 })).toBe('7 items prepared · 2 still need retailer review');
  });
});
