import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  isKrogerLocationConfirmationValid,
  krogerCartUrlForBanner,
  resolveKrogerShoppingLocation,
} from '../krogerShoppingLocation.ts';

Deno.test('opens a Smiths cart on the Smiths storefront', () => {
  assertEquals(krogerCartUrlForBanner("Smith's"), 'https://www.smithsfoodanddrug.com/cart');
});

Deno.test('keeps Kroger carts on the Kroger storefront', () => {
  assertEquals(krogerCartUrlForBanner('Kroger'), 'https://www.kroger.com/cart');
});

Deno.test('routes Seattle banners to their own storefronts', () => {
  assertEquals(krogerCartUrlForBanner('QFC'), 'https://www.qfc.com/cart');
  assertEquals(krogerCartUrlForBanner('Fred Meyer'), 'https://www.fredmeyer.com/cart');
});

Deno.test('routes the supported Kroger-family banners through an explicit allowlist', () => {
  assertEquals(krogerCartUrlForBanner("Fry's Food Stores"), 'https://www.frysfood.com/cart');
  assertEquals(krogerCartUrlForBanner('King Soopers'), 'https://www.kingsoopers.com/cart');
  assertEquals(krogerCartUrlForBanner('Ralphs'), 'https://www.ralphs.com/cart');
});

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

Deno.test('requires the cart write confirmation to name the exact account store', () => {
  assertEquals(isKrogerLocationConfirmationValid(
    { locationId: 'store-1', authority: 'user_confirmed' },
    'store-1',
  ), true);
  assertEquals(isKrogerLocationConfirmationValid(
    { locationId: 'store-2', authority: 'user_confirmed' },
    'store-1',
  ), false);
  assertEquals(isKrogerLocationConfirmationValid(null, 'store-1'), false);
});
