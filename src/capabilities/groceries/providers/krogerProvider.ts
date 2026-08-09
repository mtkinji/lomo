import * as Crypto from 'expo-crypto';

function base64Url(hex: string): string {
  const bytes = hex.match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [];
  const binary = String.fromCharCode(...bytes);
  return globalThis.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function createKrogerPkceChallenge(verifier: string): Promise<{ verifier: string; challenge: string; method: 'S256' }> {
  if (verifier.length < 43 || verifier.length > 128 || !/^[A-Za-z0-9._~-]+$/.test(verifier)) throw new Error('provider.pkce_invalid');
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier);
  return { verifier, challenge: base64Url(digest), method: 'S256' };
}

export function krogerCartRecovery(input: { acknowledged: boolean; networkOutcomeKnown: boolean }): 'complete' | 'retry' | 'check_retailer_cart' {
  if (input.acknowledged) return 'complete';
  return input.networkOutcomeKnown ? 'retry' : 'check_retailer_cart';
}

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const cents = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 100) : null;

export type KrogerLocation = { id: string; name: string; banner: string; address: string };
export type KrogerProduct = { id: string; upc: string; title: string; brand: string | null; size: string | null; regularPriceCents: number | null; promoPriceCents: number | null; pickupAvailable: boolean };

export function normalizeKrogerLocations(value: unknown): KrogerLocation[] {
  const rows = Array.isArray(record(value).data) ? record(value).data as unknown[] : [];
  return rows.flatMap((raw) => {
    const row = record(raw); const address = record(row.address); const id = text(row.locationId); const name = text(row.name);
    if (!id || !name) return [];
    const chain = text(row.chain).toLowerCase();
    const banner = chain.includes('smith') || name.toLowerCase().includes('smith') ? "Smith's" : name;
    const street = text(address.addressLine1); const stateZip = [text(address.state), text(address.zipCode)].filter(Boolean).join(' '); const locality = [text(address.city), stateZip].filter(Boolean).join(', ');
    return [{ id, name, banner, address: [street, locality].filter(Boolean).join(' · ') }];
  });
}

export function normalizeKrogerProducts(value: unknown): KrogerProduct[] {
  const rows = Array.isArray(record(value).data) ? record(value).data as unknown[] : [];
  return rows.flatMap((raw) => {
    const row = record(raw); const variants = Array.isArray(row.items) ? row.items : []; const item = record(variants[0]); const price = record(item.price); const fulfillment = record(item.fulfillment);
    const id = text(row.productId); const upc = text(row.upc) || id; const title = text(row.description);
    if (!id || !upc || !title) return [];
    return [{ id, upc, title, brand: text(row.brand) || null, size: text(item.size) || null, regularPriceCents: cents(price.regular), promoPriceCents: cents(price.promo), pickupAvailable: fulfillment.curbside === true }];
  });
}

export function buildKrogerCartPayload(items: Array<{ upc: string; quantity: number }>) {
  if (!items.length) throw new Error('provider.cart_empty');
  return { items: items.map((item) => {
    const upc = item.upc.trim(); const quantity = Math.floor(item.quantity);
    if (!upc || !Number.isFinite(quantity) || quantity < 1) throw new Error('provider.cart_item_invalid');
    return { upc, quantity, modality: 'PICKUP' as const };
  }) };
}
