export type MealPlanningDelivery = {
  idempotency_key: string;
  recipient_user_id: string;
  actor_user_id: string;
  event_kind: 'meal_choice_round';
  source_capability: 'meal-planning';
  source_entity_type: 'meal_choice_round';
  source_entity_id: string;
  actor_display_name: string | null;
  title: string;
  body: string;
  destination: { kind: 'meal_choice'; roundId: string };
  state: 'pending';
  expires_at: string | null;
  retain_until: string;
};

export function buildMealChoiceDelivery(input: {
  roundId: string;
  recipientUserId: string;
  actorUserId: string;
  actorDisplayName: string | null;
  closesAt: string | null;
  nowIso?: string;
}): MealPlanningDelivery {
  const now = input.nowIso && Number.isFinite(Date.parse(input.nowIso)) ? new Date(input.nowIso) : new Date();
  return {
    idempotency_key: `meal_choice_round:${input.roundId}:${input.recipientUserId}`,
    recipient_user_id: input.recipientUserId,
    actor_user_id: input.actorUserId,
    event_kind: 'meal_choice_round',
    source_capability: 'meal-planning',
    source_entity_type: 'meal_choice_round',
    source_entity_id: input.roundId,
    actor_display_name: input.actorDisplayName?.trim().slice(0, 80) || null,
    title: 'Help choose the next meals',
    body: 'Pick what sounds good, pass, or suggest one.',
    destination: { kind: 'meal_choice', roundId: input.roundId },
    state: 'pending',
    expires_at: input.closesAt,
    retain_until: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
