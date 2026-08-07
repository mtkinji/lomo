import { createGroceryActivityCardProvider } from './groceryActivityCardProvider';

const binding = { providerId: 'groceries' as const, projectionKind: 'shopping_list', resourceRef: 'list-1', sourceVersion: '3' };
const context = { viewerPersonId: 'person-1', activityId: 'activity-1' };

describe('Grocery Activity card', () => {
  it.each([
    [{ state: 'review_needed', handoffState: null, expiresAt: null }, 'Review grocery list', 'review_list'],
    [{ state: 'ready', handoffState: null, expiresAt: null }, 'Groceries are ready', 'shop'],
    [{ state: 'ready', handoffState: 'provider_link_created', expiresAt: '2099-01-01T00:00:00.000Z' }, 'Continue on Instacart', 'shop'],
    [{ state: 'ready', handoffState: 'opened_for_product_review', expiresAt: '2099-01-01T00:00:00.000Z' }, 'Finish choosing products', 'shop'],
  ])('projects current authority without copying list contents', async (authority, title, actionId) => {
    const provider = createGroceryActivityCardProvider({ resolve: jest.fn().mockResolvedValue(authority), navigate: jest.fn(), copy: jest.fn(), now: () => new Date('2026-08-05T00:00:00.000Z') });
    await expect(provider.resolve(binding, context)).resolves.toEqual(expect.objectContaining({ title, primaryAction: expect.objectContaining({ id: actionId }) }));
  });

  it('marks stale and expired links truthfully and never claims an order', async () => {
    const provider = createGroceryActivityCardProvider({ resolve: jest.fn().mockResolvedValue({ state: 'ready', handoffState: 'provider_link_created', expiresAt: '2026-08-04T00:00:00.000Z' }), navigate: jest.fn(), copy: jest.fn(), now: () => new Date('2026-08-05T00:00:00.000Z') });
    const projection = await provider.resolve(binding, context);
    expect(projection).toEqual(expect.objectContaining({ state: 'stale', title: 'Retailer link expired' }));
    expect(JSON.stringify(projection).toLowerCase()).not.toContain('ordered');
  });

  it('navigates or copies without mutating grocery authority', async () => {
    const navigate = jest.fn(); const copy = jest.fn();
    const provider = createGroceryActivityCardProvider({ resolve: jest.fn().mockResolvedValue({ state: 'ready', handoffState: null, expiresAt: null }), navigate, copy });
    await provider.invoke({ binding, context, actionId: 'shop', idempotencyKey: 'one' });
    await provider.invoke({ binding, context, actionId: 'copy', idempotencyKey: 'two' });
    expect(navigate).toHaveBeenCalledWith({ screen: 'GroceryHandoff', params: { listId: 'list-1' } });
    expect(copy).toHaveBeenCalledWith('list-1');
  });
});
