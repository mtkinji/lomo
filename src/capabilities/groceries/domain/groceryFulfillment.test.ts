import { groceryFulfillmentSummary } from './groceryFulfillment';

const item = (id: string, carted = false) => ({
  id,
  state: 'needed' as const,
  retailerCart: carted
    ? { provider: 'kroger' as const, retailerLabel: "Smith's", locationName: 'Saratoga Springs', state: 'cart_add_acknowledged' as const }
    : null,
});

describe('grocery fulfillment summary', () => {
  it("leads with the preferred store before the first cart pass", () => {
    expect(groceryFulfillmentSummary([item('one'), item('two')])).toEqual({
      remainingCount: 2,
      cartedCount: 0,
      actionLabel: 'Shop online',
      disabled: false,
    });
  });

  it('offers another pass only for items not already in a retailer cart', () => {
    expect(groceryFulfillmentSummary([item('one', true), item('two'), item('three')])).toEqual({
      remainingCount: 2,
      cartedCount: 1,
      actionLabel: 'Shop 2 remaining',
      disabled: false,
    });
  });

  it('does not offer another pass when every needed item is in a retailer cart', () => {
    expect(groceryFulfillmentSummary([item('one', true)])).toEqual({
      remainingCount: 0,
      cartedCount: 1,
      actionLabel: 'Everything is in carts',
      disabled: true,
    });
  });
});
