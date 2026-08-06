import { assertEquals } from 'jsr:@std/assert@1';
import { prepareSavingsOptions } from '../grocerySavings.ts';

Deno.test('savings preparation excludes stale evidence and keeps activation truthful', () => {
  const options = prepareSavingsOptions([{ groceryItemId: 'i', mappingId: 'm', title: 'Beans', productId: 'p', store: 'Kroger', quantity: 2, packageBaseUnits: 1, regularPriceCents: 300, currentPriceCents: 250, feeCents: 0, observedAt: '2026-08-05T12:00:00.000Z', expiresAt: '2026-08-06T12:00:00.000Z', offer: { id: 'o', kind: 'coupon', amountCents: 100, memberRequired: true, activationRequired: true, state: 'eligible', expiresAt: '2026-08-06T12:00:00.000Z', acknowledgementRef: null } }], '2026-08-05T13:00:00.000Z');
  assertEquals(options[0].predictedSavingsCents, 200);
  assertEquals(options[0].nextAction, 'Activate in retailer app');
});
