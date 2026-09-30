/** Preserve the Store's formatted price. Only the unambiguous leading $ gets raised. */
export function splitFoundingOfferPrice(price: string): { symbol: string; amount: string } {
  return /^\$\d/.test(price)
    ? { symbol: '$', amount: price.slice(1) }
    : { symbol: '', amount: price };
}
