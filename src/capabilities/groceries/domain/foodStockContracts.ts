export type FoodStockState = 'confirmed' | 'likely' | 'check_first' | 'depleted';
export type FoodStockObservation = {
  id: string; ownerPersonId: string; concept: string; state: FoodStockState; quantityMin: number | null; quantityMax: number | null; unit: string | null;
  source: 'already_have' | 'manual' | 'voice' | 'photo' | 'receipt' | 'order'; confidence: number; observedAt: string; expiresAt: string | null;
  supersedesObservationId: string | null; correctedAt: string | null;
};
export type FoodCycleSpendingConstraint = { id: string; ownerPersonId: string; cycleRef: string; targetCents: number; moneyEnvelope: { sourcePlanVersionId: string; categoryIds: string[]; remainingCents: number; observedAt: string; assumptions: string[] } | null; createdAt: string };
export class FoodStockContractError extends Error { constructor(public readonly code: string, message: string) { super(message); this.name = 'FoodStockContractError'; } }
export function parseFoodStockObservation(value: FoodStockObservation): FoodStockObservation {
  if (!value.id || !value.ownerPersonId || !value.concept.trim()) throw new FoodStockContractError('food_stock.identity_invalid', 'Stock observation identity, owner, and concept are required.');
  if (!['confirmed','likely','check_first','depleted'].includes(value.state) || !['already_have','manual','voice','photo','receipt','order'].includes(value.source)) throw new FoodStockContractError('food_stock.state_invalid', 'Stock state or source is invalid.');
  if (typeof value.confidence !== 'number' || value.confidence < 0 || value.confidence > 1) throw new FoodStockContractError('food_stock.confidence_invalid', 'Stock confidence must be between zero and one.');
  if ((value.quantityMin !== null && (!Number.isFinite(value.quantityMin) || value.quantityMin < 0)) || (value.quantityMax !== null && (!Number.isFinite(value.quantityMax) || value.quantityMax < 0)) || (value.quantityMin !== null && value.quantityMax !== null && value.quantityMax < value.quantityMin)) throw new FoodStockContractError('food_stock.range_invalid', 'Stock quantity range is invalid.');
  if ((value.source === 'receipt' || value.source === 'order') && value.state === 'confirmed') throw new FoodStockContractError('food_stock.receipt_not_confirmed', 'Purchase evidence begins as likely stock until explicitly confirmed.');
  if (!Number.isFinite(Date.parse(value.observedAt)) || (value.expiresAt && !Number.isFinite(Date.parse(value.expiresAt))) || (value.correctedAt && !Number.isFinite(Date.parse(value.correctedAt)))) throw new FoodStockContractError('food_stock.date_invalid', 'Stock observation time is invalid.');
  return { ...value };
}
export function effectiveFoodStockState(value: FoodStockObservation, now: string): FoodStockState {
  const observation = parseFoodStockObservation(value); if (!Number.isFinite(Date.parse(now))) throw new FoodStockContractError('food_stock.date_invalid', 'Current time is invalid.');
  if (observation.state === 'depleted' || !observation.expiresAt || Date.parse(now) <= Date.parse(observation.expiresAt)) return observation.state;
  return 'check_first';
}
export function parseFoodCycleSpendingConstraint(value: FoodCycleSpendingConstraint): FoodCycleSpendingConstraint {
  if (!value.id || !value.ownerPersonId || !value.cycleRef || !Number.isSafeInteger(value.targetCents) || value.targetCents < 0 || !Number.isFinite(Date.parse(value.createdAt))) throw new FoodStockContractError('food_stock.constraint_invalid', 'Food trip target identity, cycle, and integer cents are required.');
  if (value.moneyEnvelope && (!value.moneyEnvelope.sourcePlanVersionId || !value.moneyEnvelope.categoryIds.length || !Number.isSafeInteger(value.moneyEnvelope.remainingCents) || !Number.isFinite(Date.parse(value.moneyEnvelope.observedAt)))) throw new FoodStockContractError('food_stock.constraint_invalid', 'Money envelope reference is incomplete.');
  return { ...value, moneyEnvelope: value.moneyEnvelope ? { ...value.moneyEnvelope, categoryIds: [...value.moneyEnvelope.categoryIds], assumptions: [...value.moneyEnvelope.assumptions] } : null };
}
