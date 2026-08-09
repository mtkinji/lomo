import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { resolveKrogerShoppingLocation } from '../krogerShoppingLocation.ts';

Deno.test('uses an explicit Kroger-family store before OAuth exists', () => {
  assertEquals(
    resolveKrogerShoppingLocation(
      { id: '70600123', name: 'Smiths', address: '689 N Redwood Rd', banner: "Smith's" },
      null,
    ),
    { id: '70600123', name: 'Smiths', address: '689 N Redwood Rd', banner: "Smith's" },
  );
});

Deno.test('falls back to the connected account location', () => {
  assertEquals(
    resolveKrogerShoppingLocation(null, {
      location_id: 'store-2', location_name: 'Kroger Downtown', location_address: 'Main St', retailer_label: 'Kroger',
    }),
    { id: 'store-2', name: 'Kroger Downtown', address: 'Main St', banner: 'Kroger' },
  );
});
