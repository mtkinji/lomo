export type RetailerBatchItemStatus = 'ready' | 'review' | 'unavailable';

export type RetailerBatchItem = {
  itemId: string;
  status: RetailerBatchItemStatus;
  productId?: string;
  title?: string;
  reason?: string;
};

export type RetailerBatchPreparation = {
  schemaVersion: 1;
  retailerId: 'amazon';
  listId: string;
  listRevision: number;
  source: 'provider' | 'preview';
  observedAt: string;
  cartUrl: string | null;
  items: RetailerBatchItem[];
};

type ExpectedPreparation = { listId: string; listRevision: number; itemIds: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAmazonCartUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    const hasPartnerTag = Boolean(
      url.searchParams.get('tag')?.trim()
      || url.searchParams.get('AssociateTag')?.trim(),
    );
    return url.protocol === 'https:'
      && /^(www\.)?amazon\.com$/i.test(url.hostname)
      && url.pathname === '/gp/cart/view.html'
      && hasPartnerTag;
  } catch {
    return false;
  }
}

export function parseRetailerBatchPreparation(
  value: unknown,
  expected: ExpectedPreparation,
): RetailerBatchPreparation | null {
  if (!isRecord(value) || value.schemaVersion !== 1 || value.retailerId !== 'amazon') return null;
  if (value.listId !== expected.listId || value.listRevision !== expected.listRevision) return null;
  if (value.source !== 'provider' && value.source !== 'preview') return null;
  if (typeof value.observedAt !== 'string' || !Number.isFinite(Date.parse(value.observedAt))) return null;
  if (!Array.isArray(value.items) || value.items.length !== expected.itemIds.length) return null;

  const expectedIds = new Set(expected.itemIds);
  const seen = new Set<string>();
  const items: RetailerBatchItem[] = [];
  for (const raw of value.items) {
    if (!isRecord(raw) || typeof raw.itemId !== 'string' || !expectedIds.has(raw.itemId) || seen.has(raw.itemId)) return null;
    if (raw.status !== 'ready' && raw.status !== 'review' && raw.status !== 'unavailable') return null;
    if ((raw.status === 'ready' || raw.status === 'review') && (typeof raw.productId !== 'string' || !raw.productId.trim() || typeof raw.title !== 'string' || !raw.title.trim())) return null;
    if (raw.reason !== undefined && typeof raw.reason !== 'string') return null;
    seen.add(raw.itemId);
    items.push({
      itemId: raw.itemId,
      status: raw.status,
      ...(typeof raw.productId === 'string' ? { productId: raw.productId } : {}),
      ...(typeof raw.title === 'string' ? { title: raw.title } : {}),
      ...(typeof raw.reason === 'string' ? { reason: raw.reason } : {}),
    });
  }

  const cartUrl = value.cartUrl === null ? null : value.cartUrl;
  if (cartUrl !== null && !isAmazonCartUrl(cartUrl)) return null;
  if (value.source === 'preview' && cartUrl !== null) return null;

  return {
    schemaVersion: 1,
    retailerId: 'amazon',
    listId: expected.listId,
    listRevision: expected.listRevision,
    source: value.source,
    observedAt: value.observedAt,
    cartUrl,
    items,
  };
}

export function summarizeRetailerBatchPreparation(preparation: RetailerBatchPreparation) {
  return {
    totalCount: preparation.items.length,
    readyCount: preparation.items.filter((item) => item.status === 'ready').length,
    reviewCount: preparation.items.filter((item) => item.status === 'review').length,
    unavailableCount: preparation.items.filter((item) => item.status === 'unavailable').length,
    canOpenBatchCart: preparation.source === 'provider'
      && preparation.cartUrl !== null
      && preparation.items.some((item) => item.status === 'ready'),
  };
}
