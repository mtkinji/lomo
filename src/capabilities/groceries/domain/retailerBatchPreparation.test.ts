import {
  parseRetailerBatchPreparation,
  summarizeRetailerBatchPreparation,
} from './retailerBatchPreparation';

const base = {
  schemaVersion: 1 as const,
  retailerId: 'amazon' as const,
  listId: 'list-1',
  listRevision: 4,
  source: 'provider' as const,
  observedAt: '2026-08-14T18:00:00.000Z',
  cartUrl: 'https://www.amazon.com/gp/cart/view.html?tag=kwiltapp-20',
  items: [
    { itemId: 'milk', status: 'ready' as const, productId: 'B000000001', title: 'Unsweetened almond milk, 6 pack' },
    { itemId: 'eggs', status: 'review' as const, productId: 'B000000002', title: 'Large eggs, 12 count', reason: 'Package choice' },
    { itemId: 'tomatoes', status: 'unavailable' as const, reason: 'No confident Amazon match' },
  ],
};

describe('retailer batch preparation', () => {
  it('parses provider evidence and partitions the whole list', () => {
    const result = parseRetailerBatchPreparation(base, {
      listId: 'list-1',
      listRevision: 4,
      itemIds: ['milk', 'eggs', 'tomatoes'],
    });

    expect(result).not.toBeNull();
    expect(summarizeRetailerBatchPreparation(result!)).toEqual({
      totalCount: 3,
      readyCount: 1,
      reviewCount: 1,
      unavailableCount: 1,
      canOpenBatchCart: true,
    });
  });

  it('rejects duplicate, unknown, or incomplete item evidence', () => {
    const expected = { listId: 'list-1', listRevision: 4, itemIds: ['milk', 'eggs', 'tomatoes'] };
    expect(parseRetailerBatchPreparation({ ...base, items: [...base.items, base.items[0]] }, expected)).toBeNull();
    expect(parseRetailerBatchPreparation({ ...base, items: base.items.map((item, index) => index === 0 ? { ...item, itemId: 'other' } : item) }, expected)).toBeNull();
    expect(parseRetailerBatchPreparation({ ...base, items: base.items.slice(0, 2) }, expected)).toBeNull();
  });

  it('never enables a cart action for preview evidence', () => {
    const preview = parseRetailerBatchPreparation({
      ...base,
      source: 'preview',
      cartUrl: null,
      items: base.items.map((item) => item.status === 'ready' ? { ...item, productId: `preview:${item.itemId}` } : item),
    }, { listId: 'list-1', listRevision: 4, itemIds: ['milk', 'eggs', 'tomatoes'] });

    expect(preview).not.toBeNull();
    expect(summarizeRetailerBatchPreparation(preview!).canOpenBatchCart).toBe(false);
  });

  it('rejects non-Amazon and unapproved cart URLs', () => {
    const expected = { listId: 'list-1', listRevision: 4, itemIds: ['milk', 'eggs', 'tomatoes'] };
    expect(parseRetailerBatchPreparation({ ...base, cartUrl: 'https://example.com/cart' }, expected)).toBeNull();
    expect(parseRetailerBatchPreparation({ ...base, cartUrl: 'http://www.amazon.com/cart' }, expected)).toBeNull();
    expect(parseRetailerBatchPreparation({ ...base, cartUrl: 'https://www.amazon.com/cart' }, expected)).toBeNull();
  });
});
