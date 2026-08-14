import type { KrogerLocation } from '../providers/krogerProvider';
import type { RetailerRuntimePolicy } from '../providers/groceryProviderContracts';

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
  kroger: 'Your grocery store',
  walmart: 'Walmart',
};

type ActionableRetailerInput = {
  fulfillment: OnlineFulfillmentPreference;
  policies: RetailerRuntimePolicy[];
  preferredStore: KrogerLocation | null;
};

function policySupportsFulfillment(
  policy: RetailerRuntimePolicy,
  fulfillment: OnlineFulfillmentPreference,
): boolean {
  const supportsMode = fulfillment === 'either'
    ? policy.supportedModes.length > 0
    : policy.supportedModes.includes(fulfillment);
  if (!supportsMode || !policy.approvedSurface || !policy.productEvidence) return false;
  if (policy.capability === 'product_links') return !policy.cartWrite;
  return policy.capability === 'cart_prepare' && policy.cartWrite;
}

export function deriveActionableRetailerPreferences({
  fulfillment,
  policies,
  preferredStore,
}: ActionableRetailerInput): RetailerPreference[] {
  const policyByRetailer = new Map(policies.map((policy) => [policy.retailerId, policy]));
  return RETAILER_IDS.flatMap((id) => {
    const policy = policyByRetailer.get(id);
    if (!policy || !policySupportsFulfillment(policy, fulfillment)) return [];
    if (id === 'kroger' && !preferredStore) return [];
    if (id === 'costco' || id === 'other') return [];
    return [{
      id,
      enabled: true,
      rank: 0,
      label: id === 'kroger'
        ? preferredStore?.banner || preferredStore?.name || 'Your grocery store'
        : RETAILER_LABELS[id],
      membershipConfirmed: null,
    } satisfies RetailerPreference];
  }).map((retailer, index) => ({ ...retailer, rank: index + 1 }));
}

export function reconcileActionableRetailerPreferences(
  input: ActionableRetailerInput & { retailers: RetailerPreference[] },
): RetailerPreference[] {
  const actionable = deriveActionableRetailerPreferences(input);
  const actionableById = new Map(actionable.map((retailer) => [retailer.id, retailer]));
  const retained = input.retailers
    .filter((retailer) => actionableById.has(retailer.id))
    .sort((left, right) => {
      if (left.enabled !== right.enabled) return left.enabled ? -1 : 1;
      return left.rank - right.rank;
    })
    .map((retailer) => ({
      ...retailer,
      rank: retailer.enabled ? retailer.rank : 0,
      label: actionableById.get(retailer.id)?.label ?? retailer.label,
      membershipConfirmed: null,
    }));
  const retainedIds = new Set(retained.map((retailer) => retailer.id));
  const nextRank = retained.filter((retailer) => retailer.enabled).length;
  const newlyActionable = actionable
    .filter((retailer) => !retainedIds.has(retailer.id))
    .map((retailer, index) => ({ ...retailer, rank: nextRank + index + 1 }));
  return normalizeRetailerPreferenceOrder([...retained, ...newlyActionable]);
}

export function createDefaultOnlineShoppingPreferences(
  savedAt = new Date().toISOString(),
): OnlineShoppingPreferences {
  return {
    schemaVersion: 1,
    defaultFulfillment: 'either',
    homePostalCode: null,
    savedAt,
    retailers: [],
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
