import { buildMealChoiceDelivery } from '../mealPlanningDelivery.ts';

Deno.test('meal choice delivery is exact, neutral, opaque, and idempotent per participant', () => {
  const delivery = buildMealChoiceDelivery({ roundId: 'round-1', recipientUserId: 'user-2', actorUserId: 'user-1', actorDisplayName: 'Maya', closesAt: '2026-08-08T18:00:00.000Z', nowIso: '2026-08-05T18:00:00.000Z' });
  if (delivery.idempotency_key !== 'meal_choice_round:round-1:user-2') throw new Error('idempotency scope changed');
  if (delivery.title !== 'Help choose the next meals' || delivery.body !== 'Pick what sounds good, pass, or suggest one.') throw new Error('neutral copy changed');
  if (JSON.stringify(delivery.destination) !== JSON.stringify({ kind: 'meal_choice', roundId: 'round-1' })) throw new Error('destination leaked data');
  if ('candidateIds' in delivery.destination || JSON.stringify(delivery).includes('recipe')) throw new Error('private candidate leaked');
});
