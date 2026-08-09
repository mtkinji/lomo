export type GroceryFulfillmentItem = {
  state: 'needed' | 'already_have' | 'purchased' | 'skipped';
  retailerCart?: unknown | null;
};

export function groceryFulfillmentSummary(items: GroceryFulfillmentItem[]) {
  const needed = items.filter((item) => item.state === 'needed');
  const cartedCount = needed.filter((item) => item.retailerCart).length;
  const remainingCount = needed.length - cartedCount;
  return {
    remainingCount,
    cartedCount,
    actionLabel:
      cartedCount === 0
        ? 'Shop online'
        : remainingCount === 0
          ? 'Everything is in carts'
          : `Shop ${remainingCount} remaining`,
    disabled: remainingCount === 0,
  };
}
