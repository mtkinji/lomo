import { getAmazonAssociatesTag } from '../utils/getEnv';

export type SendToRetailer = 'amazon' | 'homeDepot' | 'instacart' | 'doorDash';

function normalizeQuery(input: string): string {
  const q = String(input ?? '').trim();
  // Keep URLs reasonably short (especially for Home Depot path-based search).
  return q.length > 140 ? q.slice(0, 140) : q;
}

export function buildRetailerSearchUrl(retailer: SendToRetailer, query: string): string {
  const q = normalizeQuery(query);
  if (!q) return '';
  const encoded = encodeURIComponent(q);

  if (retailer === 'amazon') {
    return `https://www.amazon.com/s?k=${encoded}`;
  }
  if (retailer === 'homeDepot') {
    return `https://www.homedepot.com/s/${encoded}`;
  }
  if (retailer === 'instacart') {
    return `https://www.instacart.com/store/s?k=${encoded}`;
  }
  if (retailer === 'doorDash') {
    return `https://www.doordash.com/search/store/${encoded}/`;
  }
  return '';
}

/**
 * Apply affiliate tracking to a retailer URL when configured.
 *
 * Today: only Amazon is supported (simple `tag=` param).
 * Post-launch: add "go links" (e.g., https://go.kwilt.app/...) for networks like Impact/CJ.
 */
export function withAffiliateTracking(retailer: SendToRetailer, url: string): string {
  const raw = String(url ?? '').trim();
  if (!raw) return raw;

  if (retailer === 'amazon') {
    const tag = getAmazonAssociatesTag();
    if (!tag) return raw;
    try {
      const parsed = new URL(raw);
      // Avoid touching non-Amazon domains.
      if (!/amazon\./i.test(parsed.hostname)) return raw;
      parsed.searchParams.set('tag', tag);
      return parsed.toString();
    } catch {
      return raw;
    }
  }

  // No-op for now (future affiliate routing lives behind this boundary).
  return raw;
}

export function buildAffiliateRetailerSearchUrl(retailer: SendToRetailer, query: string): string {
  const base = buildRetailerSearchUrl(retailer, query);
  return base ? withAffiliateTracking(retailer, base) : base;
}


