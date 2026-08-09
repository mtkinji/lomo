export type RetailerListItem = {
  concept: string;
  quantityMin: number | null;
  quantityMax: number | null;
  unit: string | null;
  note: string | null;
};

export type InstacartListPayload = {
  title: string;
  link_type: 'shopping_list';
  expires_in: number;
  line_items: Array<{
    name: string;
    display_text?: string;
    line_item_measurements?: Array<{ quantity: number; unit: string }>;
  }>;
};

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export class RetailerAdapterError extends Error {
  readonly retryAfterSeconds: number | null;
  constructor(code: string, retryAfterSeconds: number | null = null) {
    super(code);
    this.name = 'RetailerAdapterError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function clean(value: string | null | undefined, maxLength: number): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function positiveQuantity(value: number | null): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 1;
}

const INSTACART_LINK_EXPIRY_DAYS = 30;

const INSTACART_UNITS: Record<string, string> = {
  bunch: 'bunch',
  can: 'can',
  count: 'each',
  cup: 'cup',
  each: 'each',
  gallon: 'gallon',
  gram: 'gram',
  kilogram: 'kilogram',
  liter: 'liter',
  litre: 'liter',
  milliliter: 'milliliter',
  millilitre: 'milliliter',
  ml: 'milliliter',
  ounce: 'ounce',
  package: 'package',
  pint: 'pint',
  pound: 'pound',
  quart: 'quart',
  tablespoon: 'tablespoon',
  teaspoon: 'teaspoon',
};

function instacartUnit(value: string | null): string | null {
  if (!value) return 'each';
  return INSTACART_UNITS[clean(value, 80).toLowerCase()] ?? null;
}

export function buildInstacartListPayload(title: string, items: RetailerListItem[]): InstacartListPayload {
  if (!items.length || items.length > 500) throw new RetailerAdapterError('invalid_retailer_payload');
  return {
    title: clean(title, 120) || 'Kwilt groceries',
    link_type: 'shopping_list',
    expires_in: INSTACART_LINK_EXPIRY_DAYS,
    line_items: items.map((item) => {
      const name = clean(item.concept, 320);
      if (!name) throw new RetailerAdapterError('invalid_retailer_payload');
      const quantity = positiveQuantity(item.quantityMin);
      const originalUnit = clean(item.unit, 80) || 'each';
      const unit = instacartUnit(item.unit);
      const range = item.quantityMax !== null && item.quantityMax > quantity
        ? `Need ${quantity}\u2013${item.quantityMax} ${originalUnit}` : '';
      const note = clean(item.note, 300);
      const unsupportedMeasurement = unit ? '' : `${quantity} ${originalUnit} ${name}`;
      const hasDisplayDetail = Boolean(note || range || unsupportedMeasurement);
      const displayText = hasDisplayDetail
        ? [unit ? name : unsupportedMeasurement, note, range].filter(Boolean).join(' · ')
        : '';
      return {
        name,
        ...(displayText ? { display_text: displayText } : {}),
        ...(unit ? { line_item_measurements: [{ quantity, unit }] } : {}),
      };
    }),
  };
}

export function parseInstacartListLinkResponse(value: unknown): { url: string; providerRequestId: string | null } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RetailerAdapterError('malformed_provider_response');
  const row = value as Record<string, unknown>;
  const candidate = [row.products_link_url, row.url, row.productsLinkUrl].find((item) => typeof item === 'string');
  try {
    const url = new URL(String(candidate ?? ''));
    if (url.protocol !== 'https:' || !(url.hostname === 'instacart.com' || url.hostname.endsWith('.instacart.com'))) {
      throw new Error('unsafe_url');
    }
    const requestId = [row.request_id, row.requestId, row.id].find((item) => typeof item === 'string');
    return { url: url.toString(), providerRequestId: typeof requestId === 'string' ? requestId.slice(0, 320) : null };
  } catch {
    throw new RetailerAdapterError('malformed_provider_response');
  }
}

export async function createInstacartListLink(input: {
  enabled: boolean;
  apiKey: string | null;
  payload: InstacartListPayload;
  endpoint?: string;
  timeoutMs?: number;
  fetcher?: Fetcher;
}): Promise<{ url: string; providerRequestId: string | null; expiresAt: string }> {
  if (!input.enabled) throw new RetailerAdapterError('provider_disabled');
  if (!input.apiKey?.trim()) throw new RetailerAdapterError('provider_unavailable');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 10_000);
  try {
    const response = await (input.fetcher ?? fetch)(input.endpoint ?? 'https://connect.dev.instacart.tools/idp/v1/products/products_link', {
      method: 'POST',
      headers: { authorization: `Bearer ${input.apiKey.trim()}`, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(input.payload),
      signal: controller.signal,
    });
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('retry-after'));
      throw new RetailerAdapterError('provider_rate_limited', Number.isFinite(retryAfter) ? retryAfter : null);
    }
    if (!response.ok) throw new RetailerAdapterError('provider_failed');
    const parsed = parseInstacartListLinkResponse(await response.json().catch(() => null));
    return {
      ...parsed,
      expiresAt: new Date(Date.now() + input.payload.expires_in * 24 * 60 * 60 * 1000).toISOString(),
    };
  } catch (error) {
    if (error instanceof RetailerAdapterError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') throw new RetailerAdapterError('provider_timeout');
    throw new RetailerAdapterError('provider_unavailable');
  } finally {
    clearTimeout(timeout);
  }
}
