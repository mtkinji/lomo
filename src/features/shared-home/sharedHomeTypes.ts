export type SharedHomeDestination =
  | { kind: 'goal_invite'; inviteCode: string }
  | { kind: 'game_room'; sessionId: string };

export type SharedHomeState = 'pending' | 'settled' | 'expired' | 'unavailable';

export type SharedHomeDelivery = {
  id: string;
  eventKind: 'goal_invitation' | 'game_turn';
  sourceCapability: 'goals' | 'games';
  sourceEntityType: 'goal_invite' | 'game_session';
  sourceEntityId: string;
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
  recent: SharedHomeDelivery[];
};
