export type KrogerShoppingLocation = {
  id: string;
  name: string;
  address: string;
  banner: string;
};

type KrogerAccountLocation = {
  location_id?: unknown;
  location_name?: unknown;
  location_address?: unknown;
  retailer_label?: unknown;
};

const clean = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const BANNER_DOMAINS: Array<[RegExp, string]> = [
  [/baker/i, 'bakersplus.com'], [/city\s*market/i, 'citymarket.com'],
  [/dillon/i, 'dillons.com'], [/food\s*4\s*less/i, 'food4less.com'],
  [/foods\s*co/i, 'foodsco.net'], [/fred\s*meyer/i, 'fredmeyer.com'],
  [/fry'?s/i, 'frysfood.com'], [/gerbes/i, 'gerbes.com'],
  [/harris\s*teeter/i, 'harristeeter.com'], [/jay\s*c/i, 'jaycfoods.com'],
  [/king\s*soopers/i, 'kingsoopers.com'], [/mariano/i, 'marianos.com'],
  [/metro\s*market/i, 'metromarket.net'], [/pay.?less/i, 'pay-less.com'],
  [/pick\s*['’]?n\s*save/i, 'picknsave.com'], [/\bqfc\b/i, 'qfc.com'],
  [/ralphs/i, 'ralphs.com'], [/smith/i, 'smithsfoodanddrug.com'],
  [/kroger/i, 'kroger.com'],
];

export function krogerCartUrlForBanner(banner: unknown) {
  const label = clean(banner, 80);
  const domain = BANNER_DOMAINS.find(([pattern]) => pattern.test(label))?.[1] ?? 'kroger.com';
  return `https://www.${domain}/cart`;
}

export function isKrogerLocationConfirmationValid(
  confirmation: unknown,
  accountLocationId: unknown,
): boolean {
  const row = confirmation && typeof confirmation === 'object'
    ? confirmation as Record<string, unknown>
    : {};
  return clean(row.authority, 40) === 'user_confirmed'
    && clean(row.locationId, 80) !== ''
    && clean(row.locationId, 80) === clean(accountLocationId, 80);
}

export function resolveKrogerShoppingLocation(
  requested: unknown,
  account: KrogerAccountLocation | null,
): KrogerShoppingLocation | null {
  const row = requested && typeof requested === 'object'
    ? requested as Record<string, unknown>
    : {};
  const requestedLocation = {
    id: clean(row.id, 80),
    name: clean(row.name, 240),
    address: clean(row.address, 240),
    banner: clean(row.banner, 80),
  };
  if (requestedLocation.id && requestedLocation.name) {
    return { ...requestedLocation, banner: requestedLocation.banner || requestedLocation.name };
  }
  const id = clean(account?.location_id, 80);
  const name = clean(account?.location_name, 240);
  if (!id || !name) return null;
  return {
    id,
    name,
    address: clean(account?.location_address, 240),
    banner: clean(account?.retailer_label, 80) || name,
  };
}
