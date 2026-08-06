export function buildInstacartHandoffRequest(groceryListId: string, expectedRevision: number) {
  if (!groceryListId || !Number.isInteger(expectedRevision) || expectedRevision < 1) throw new Error('provider.request_invalid');
  return { groceryListId, expectedRevision, provider: 'instacart' as const };
}

export function describeInstacartResult(input: { matched: number; unmatched: number }): string {
  return `${input.matched} items prepared · ${input.unmatched} still need retailer review`;
}
