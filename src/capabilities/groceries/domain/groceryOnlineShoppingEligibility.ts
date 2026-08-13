export function isOnlineShoppingCountryEligible(countryCode: string | null | undefined): boolean {
  const normalizedCountryCode = countryCode?.trim().toUpperCase();
  return normalizedCountryCode === 'US' || normalizedCountryCode === 'CA';
}
