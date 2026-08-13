export type OnlineFulfillmentPreference = 'pickup' | 'delivery' | 'either';
export type RetailerPreferenceId = 'amazon' | 'costco' | 'kroger' | 'walmart' | 'other';

export type RetailerPreference = {
  id: RetailerPreferenceId;
  enabled: boolean;
  rank: number;
  label: string;
  membershipConfirmed: boolean | null;
};

export type OnlineShoppingPreferences = {
  schemaVersion: 1;
  defaultFulfillment: OnlineFulfillmentPreference;
  retailers: RetailerPreference[];
  homePostalCode: string | null;
  savedAt: string;
};

const RETAILER_IDS: RetailerPreferenceId[] = [
  'amazon',
  'costco',
  'kroger',
  'walmart',
  'other',
];

const RETAILER_LABELS: Record<Exclude<RetailerPreferenceId, 'other'>, string> = {
  amazon: 'Amazon',
  costco: 'Costco',
  kroger: 'Kroger family',
  walmart: 'Walmart',
};

export function createDefaultOnlineShoppingPreferences(
  savedAt = new Date().toISOString(),
): OnlineShoppingPreferences {
  return {
    schemaVersion: 1,
    defaultFulfillment: 'either',
    homePostalCode: null,
    savedAt,
    retailers: RETAILER_IDS.map((id) => ({
      id,
      enabled: false,
      rank: 0,
      label: id === 'other' ? '' : RETAILER_LABELS[id],
      membershipConfirmed: null,
    })),
  };
}

export function normalizeRetailerPreferenceOrder(
  retailers: RetailerPreference[],
): RetailerPreference[] {
  const enabledByRank = retailers
    .map((retailer, index) => ({ retailer, index }))
    .filter(({ retailer }) => retailer.enabled)
    .sort((left, right) => left.retailer.rank - right.retailer.rank || left.index - right.index);
  const normalizedRanks = new Map(
    enabledByRank.map(({ retailer }, index) => [retailer.id, index + 1]),
  );

  return retailers.map((retailer) => ({
    ...retailer,
    rank: normalizedRanks.get(retailer.id) ?? 0,
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseRetailer(value: unknown): RetailerPreference | null {
  if (!isRecord(value)) return null;
  if (!RETAILER_IDS.includes(value.id as RetailerPreferenceId)) return null;
  if (typeof value.enabled !== 'boolean') return null;
  if (!Number.isInteger(value.rank) || (value.rank as number) < 0) return null;
  if (typeof value.label !== 'string') return null;
  if (value.membershipConfirmed !== null && typeof value.membershipConfirmed !== 'boolean') {
    return null;
  }
  if (value.id === 'other' && value.enabled && value.label.trim().length === 0) return null;

  return {
    id: value.id as RetailerPreferenceId,
    enabled: value.enabled,
    rank: value.rank as number,
    label: value.label.trim(),
    membershipConfirmed: value.membershipConfirmed as boolean | null,
  };
}

export function parseOnlineShoppingPreferences(value: unknown): OnlineShoppingPreferences | null {
  if (!isRecord(value) || value.schemaVersion !== 1) return null;
  if (!['pickup', 'delivery', 'either'].includes(value.defaultFulfillment as string)) return null;
  if (!Array.isArray(value.retailers)) return null;
  if (value.homePostalCode !== null && (
    typeof value.homePostalCode !== 'string' || !/^\d{5}$/.test(value.homePostalCode)
  )) return null;
  if (typeof value.savedAt !== 'string' || !Number.isFinite(Date.parse(value.savedAt))) return null;

  const retailers = value.retailers.map(parseRetailer);
  if (retailers.some((retailer) => retailer === null)) return null;
  const parsedRetailers = retailers as RetailerPreference[];
  const ids = new Set(parsedRetailers.map((retailer) => retailer.id));
  if (ids.size !== parsedRetailers.length) return null;

  const enabledRanks = parsedRetailers
    .filter((retailer) => retailer.enabled)
    .map((retailer) => retailer.rank)
    .sort((left, right) => left - right);
  if (enabledRanks.some((rank, index) => rank !== index + 1)) return null;
  if (parsedRetailers.some((retailer) => !retailer.enabled && retailer.rank !== 0)) return null;

  return {
    schemaVersion: 1,
    defaultFulfillment: value.defaultFulfillment as OnlineFulfillmentPreference,
    retailers: parsedRetailers,
    homePostalCode: value.homePostalCode as string | null,
    savedAt: value.savedAt,
  };
}
