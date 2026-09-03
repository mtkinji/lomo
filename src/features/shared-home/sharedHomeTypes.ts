export type SharedHomeDestination =
  | { kind: 'goal_invite'; inviteCode: string }
  | { kind: 'goal'; goalId: string }
  | { kind: 'game_room'; sessionId: string }
  | { kind: 'meal_choice'; roundId: string };

export type SharedHomeState = 'pending' | 'available' | 'settled' | 'expired' | 'unavailable';

export type SharedHomeDelivery = {
  id: string;
  eventKind: 'goal_invitation' | 'game_turn' | 'goal_checkin' | 'meal_choice_round';
  sourceCapability: 'goals' | 'games' | 'meal-planning';
  sourceEntityType: 'goal_invite' | 'game_session' | 'goal_checkin' | 'meal_choice_round';
  sourceEntityId: string;
  actorUserId?: string | null;
  actorDisplayName: string | null;
  title: string;
  body: string;
  destination: SharedHomeDestination;
  state: SharedHomeState;
  settledReason: string | null;
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
  expiresAt: string | null;
  retainUntil: string;
};

export type SharedHomeGroups = {
  needsYou: SharedHomeDelivery[];
  sharedWithYou: SharedHomeDelivery[];
};
