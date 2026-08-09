import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { excludeCartedGroceryItems, excludeCartedProductMappings, retailerCartCounts } from '../groceryRetailerCart.ts';

Deno.test('retailer cart receipts remove only acknowledged items from later passes', () => {
  const receipts = [{ grocery_item_id: 'milk' }];
  assertEquals(excludeCartedGroceryItems([{ id: 'milk' }, { id: 'bread' }], receipts), [{ id: 'bread' }]);
  assertEquals(
    excludeCartedProductMappings([
      { id: 'mapping-1', grocery_item_id: 'milk' },
      { id: 'mapping-2', grocery_item_id: 'bread' },
    ], receipts),
    [{ id: 'mapping-2', grocery_item_id: 'bread' }],
  );
});

Deno.test('replayed later passes count the remainder across every acknowledged cart', () => {
  assertEquals(
    retailerCartCounts(
      ['milk', 'bread', 'eggs'],
      [{ grocery_item_id: 'milk' }, { grocery_item_id: 'bread' }],
      [{ grocery_item_id: 'bread' }],
    ),
    { addedItemCount: 1, acknowledgedItemIds: ['bread'], remainingItemCount: 1 },
  );
});
