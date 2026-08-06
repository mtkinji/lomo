import { assertEquals, assertRejects, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  buildInstacartListPayload,
  createInstacartListLink,
  parseInstacartListLinkResponse,
  RetailerAdapterError,
} from '../groceryRetailerAdapters.ts';

const items = [
  { concept: 'whole milk', quantityMin: 1, quantityMax: 1, unit: 'gallon', note: null },
  { concept: 'apples', quantityMin: 4, quantityMax: 6, unit: 'each', note: 'Honeycrisp if available' },
];

Deno.test('builds a conservative Instacart list-link payload without choosing products', () => {
  assertEquals(buildInstacartListPayload('Kwilt groceries', items), {
    title: 'Kwilt groceries',
    line_items: [
      { name: 'whole milk', quantity: 1, unit: 'gallon' },
      { name: 'apples', quantity: 4, unit: 'each', instructions: 'Honeycrisp if available; Need 4–6 each' },
    ],
  });
});

Deno.test('accepts only an https product link and captures provider request id', () => {
  assertEquals(parseInstacartListLinkResponse({ products_link_url: 'https://www.instacart.com/store/recipes/abc', request_id: 'req_1' }), {
    url: 'https://www.instacart.com/store/recipes/abc', providerRequestId: 'req_1',
  });
  assertThrows(() => parseInstacartListLinkResponse({ products_link_url: 'javascript:alert(1)' }), RetailerAdapterError, 'malformed_provider_response');
});

Deno.test('remote disable prevents a provider request', async () => {
  let called = false;
  await assertRejects(() => createInstacartListLink({ enabled: false, apiKey: 'secret', payload: buildInstacartListPayload('List', items), fetcher: () => { called = true; throw new Error('unexpected'); } }), RetailerAdapterError, 'provider_disabled');
  assertEquals(called, false);
});

Deno.test('maps rate limit, provider failure, malformed response, and timeout to safe errors', async () => {
  const payload = buildInstacartListPayload('List', items);
  await assertRejects(() => createInstacartListLink({ enabled: true, apiKey: 'secret', payload, fetcher: () => Promise.resolve(new Response('{}', { status: 429, headers: { 'retry-after': '30' } })) }), RetailerAdapterError, 'provider_rate_limited');
  await assertRejects(() => createInstacartListLink({ enabled: true, apiKey: 'secret', payload, fetcher: () => Promise.resolve(new Response('{}', { status: 500 })) }), RetailerAdapterError, 'provider_failed');
  await assertRejects(() => createInstacartListLink({ enabled: true, apiKey: 'secret', payload, fetcher: () => Promise.resolve(new Response('{}', { status: 200 })) }), RetailerAdapterError, 'malformed_provider_response');
  await assertRejects(() => createInstacartListLink({
    enabled: true, apiKey: 'secret', payload, timeoutMs: 1,
    fetcher: (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }),
  }), RetailerAdapterError, 'provider_timeout');
});

Deno.test('sends a server credential and returns the reviewed-product link', async () => {
  let authorization = '';
  const result = await createInstacartListLink({
    enabled: true, apiKey: 'server-secret', payload: buildInstacartListPayload('List', items),
    fetcher: (_url, init) => { authorization = new Headers(init?.headers).get('authorization') ?? ''; return Promise.resolve(Response.json({ products_link_url: 'https://www.instacart.com/store/recipes/abc' })); },
  });
  assertEquals(authorization, 'Bearer server-secret');
  assertEquals(result.url, 'https://www.instacart.com/store/recipes/abc');
});
