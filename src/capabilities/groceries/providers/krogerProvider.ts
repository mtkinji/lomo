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
const coordinate = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
const imageSizePreference = ['small', 'thumbnail', 'medium', 'large', 'xlarge'];

function productThumbnail(value: unknown): string | null {
  const images = Array.isArray(value) ? value.map(record) : [];
  const front = images.find((image) => text(image.perspective).toLowerCase() === 'front');
  const preferred = front ?? images.find((image) => image.featured === true || image.default === true) ?? images[0];
  const sizes = Array.isArray(preferred?.sizes) ? preferred.sizes.map(record) : [];
  for (const preferredSize of imageSizePreference) {
    const url = text(sizes.find((image) => text(image.size).toLowerCase() === preferredSize)?.url);
    if (url) return url;
  }
  return text(sizes.find((image) => text(image.url))?.url) || null;
}

export type KrogerLocation = {
  id: string;
  name: string;
  banner: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
};
export type KrogerFulfillmentMode = 'pickup' | 'delivery';
export type KrogerProduct = { id: string; upc: string; title: string; brand: string | null; size: string | null; thumbnailUrl?: string | null; regularPriceCents: number | null; promoPriceCents: number | null; pickupAvailable: boolean; deliveryAvailable?: boolean };

const KROGER_BANNERS: Array<[RegExp, string]> = [
  [/baker/i, "Baker's"],
  [/city\s*market/i, 'City Market'],
  [/dillon/i, "Dillons"],
  [/food\s*4\s*less/i, 'Food 4 Less'],
  [/foods\s*co/i, 'Foods Co'],
  [/fred\s*meyer/i, 'Fred Meyer'],
  [/fry'?s/i, "Fry's"],
  [/gerbes/i, 'Gerbes'],
  [/harris\s*teeter/i, 'Harris Teeter'],
  [/jay\s*c/i, 'Jay C'],
  [/king\s*soopers/i, 'King Soopers'],
  [/kroger/i, 'Kroger'],
  [/mariano/i, "Mariano's"],
  [/metro\s*market/i, 'Metro Market'],
  [/pay.?less/i, 'Pay Less'],
  [/pick\s*['’]?n\s*save/i, "Pick 'n Save"],
  [/\bqfc\b/i, 'QFC'],
  [/ralphs/i, 'Ralphs'],
  [/ruler/i, 'Ruler Foods'],
  [/smith/i, "Smith's"],
];

export function krogerRetailerBanner(chain: unknown, name: string): string {
  const candidate = `${typeof chain === 'string' ? chain : ''} ${name}`.trim();
  return KROGER_BANNERS.find(([pattern]) => pattern.test(candidate))?.[1] ?? name;
}

export function krogerCartUrlForBanner(banner: string): string {
  const normalized = krogerRetailerBanner(banner, banner);
  const domains: Record<string, string> = {
    "Baker's": 'bakersplus.com',
    'City Market': 'citymarket.com',
    Dillons: 'dillons.com',
    'Food 4 Less': 'food4less.com',
    'Foods Co': 'foodsco.net',
    'Fred Meyer': 'fredmeyer.com',
    "Fry's": 'frysfood.com',
    Gerbes: 'gerbes.com',
    'Harris Teeter': 'harristeeter.com',
    'Jay C': 'jaycfoods.com',
    'King Soopers': 'kingsoopers.com',
    Kroger: 'kroger.com',
    "Mariano's": 'marianos.com',
    'Metro Market': 'metromarket.net',
    'Pay Less': 'pay-less.com',
    "Pick 'n Save": 'picknsave.com',
    QFC: 'qfc.com',
    Ralphs: 'ralphs.com',
    "Smith's": 'smithsfoodanddrug.com',
  };
  return `https://www.${domains[normalized] ?? 'kroger.com'}/cart`;
}

export function normalizeKrogerLocations(value: unknown): KrogerLocation[] {
  const rows = Array.isArray(record(value).data) ? record(value).data as unknown[] : [];
  return rows.flatMap((raw) => {
    const row = record(raw); const address = record(row.address); const geolocation = record(row.geolocation); const id = text(row.locationId); const name = text(row.name);
    if (!id || !name) return [];
    const banner = krogerRetailerBanner(row.chain, name);
    const street = text(address.addressLine1); const stateZip = [text(address.state), text(address.zipCode)].filter(Boolean).join(' '); const locality = [text(address.city), stateZip].filter(Boolean).join(', ');
    return [{ id, name, banner, address: [street, locality].filter(Boolean).join(' · '), latitude: coordinate(geolocation.latitude), longitude: coordinate(geolocation.longitude) }];
  });
}

export function normalizeKrogerProducts(value: unknown): KrogerProduct[] {
  const rows = Array.isArray(record(value).data) ? record(value).data as unknown[] : [];
  return rows.flatMap((raw) => {
    const row = record(raw); const variants = Array.isArray(row.items) ? row.items : []; const item = record(variants[0]); const price = record(item.price); const fulfillment = record(item.fulfillment);
    const id = text(row.productId); const upc = text(row.upc) || id; const title = text(row.description);
    if (!id || !upc || !title) return [];
    return [{ id, upc, title, brand: text(row.brand) || null, size: text(item.size) || null, thumbnailUrl: productThumbnail(row.images), regularPriceCents: cents(price.regular), promoPriceCents: cents(price.promo), pickupAvailable: fulfillment.curbside === true, deliveryAvailable: fulfillment.delivery === true }];
  });
}

export function buildKrogerCartPayload(items: Array<{ upc: string; quantity: number }>, fulfillmentMode: KrogerFulfillmentMode) {
  if (!items.length) throw new Error('provider.cart_empty');
  return { items: items.map((item) => {
    const upc = item.upc.trim(); const quantity = Math.floor(item.quantity);
    if (!upc || !Number.isFinite(quantity) || quantity < 1) throw new Error('provider.cart_item_invalid');
    return { upc, quantity, modality: fulfillmentMode === 'delivery' ? 'DELIVERY' as const : 'PICKUP' as const };
  }) };
}
