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
