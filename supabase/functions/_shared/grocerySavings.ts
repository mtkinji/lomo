export type SavingsRow = { groceryItemId: string; mappingId: string; title: string; productId: string; store: string; quantity: number; packageBaseUnits: number; regularPriceCents: number; currentPriceCents: number; feeCents: number; observedAt: string; expiresAt: string; offer?: { id: string; kind: string; amountCents: number; memberRequired: boolean; activationRequired: boolean; state: string; expiresAt: string; acknowledgementRef: string | null } | null };

export function prepareSavingsOptions(rows: SavingsRow[], now: string) {
  return rows.flatMap((row) => {
    if (Date.parse(row.expiresAt) <= Date.parse(now) || row.offer && Date.parse(row.offer.expiresAt) <= Date.parse(now)) return [];
    const offer = row.offer;
    const discount = offer && ['eligible', 'activated', 'redeemed'].includes(offer.state) ? offer.amountCents : 0;
    const netCents = Math.max(0, row.currentPriceCents * row.quantity - discount) + row.feeCents;
    const baselineCents = row.regularPriceCents * row.quantity;
    const nextAction = offer?.activationRequired && !['activated', 'redeemed'].includes(offer.state) ? 'Activate in retailer app' : offer ? 'Use this' : 'Keep current';
    return [{ id: row.mappingId, groceryItemId: row.groceryItemId, title: row.title, productId: row.productId, store: row.store, quantity: row.quantity, baseUnits: row.packageBaseUnits * row.quantity, baselineCents, netCents, predictedSavingsCents: Math.max(0, baselineCents - netCents), evidence: offer ? [{ id: offer.id, kind: offer.kind, state: offer.state, provider: row.store.toLowerCase(), productId: row.productId, amountCents: offer.amountCents, memberRequired: offer.memberRequired, activationRequired: offer.activationRequired, observedAt: row.observedAt, expiresAt: offer.expiresAt, acknowledgementRef: offer.acknowledgementRef }] : [], evidenceObservedAt: row.observedAt, expiresAt: offer?.expiresAt ?? row.expiresAt, nextAction, assumptions: row.feeCents ? [`Includes ${row.feeCents}¢ in fees`] : [] }];
  }).sort((a, b) => b.predictedSavingsCents - a.predictedSavingsCents || a.netCents - b.netCents).slice(0, 3);
}
