export type RetailerCartReceipt = { grocery_item_id: string; state?: string };

function cartedIds(receipts: RetailerCartReceipt[]) {
  return new Set(receipts.filter((receipt) => !receipt.state || receipt.state === 'cart_add_acknowledged').map((receipt) => receipt.grocery_item_id));
}

export function excludeCartedGroceryItems<T extends { id: string }>(
  items: T[],
  receipts: RetailerCartReceipt[],
): T[] {
  const ids = cartedIds(receipts);
  return items.filter((item) => !ids.has(item.id));
}

export function excludeCartedProductMappings<T extends { grocery_item_id: string }>(
  mappings: T[],
  receipts: RetailerCartReceipt[],
): T[] {
  const ids = cartedIds(receipts);
  return mappings.filter((mapping) => !ids.has(mapping.grocery_item_id));
}

export function retailerCartCounts(
  neededItemIds: string[],
  allReceipts: RetailerCartReceipt[],
  currentHandoffReceipts: RetailerCartReceipt[],
  fulfillmentMode?: 'pickup' | 'delivery',
) {
  const allCarted = cartedIds(allReceipts);
  const acknowledgedItemIds = currentHandoffReceipts.map((receipt) => receipt.grocery_item_id);
  return {
    addedItemCount: acknowledgedItemIds.length,
    acknowledgedItemIds,
    remainingItemCount: neededItemIds.filter((id) => !allCarted.has(id)).length,
    ...(fulfillmentMode ? { fulfillmentMode } : {}),
  };
}
