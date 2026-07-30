import type { BankGame } from '@/src/capabilities/games/domain/bank';

export type RemoteJoinStatus = 'local' | 'invited' | 'joined' | 'disconnected' | 'left';

export type RemoteBankParticipant = {
  id: string;
  seatIndex: number;
  displayName: string;
  userId: string | null;
  controllerUserId: string;
  role: 'host' | 'player';
  joinStatus: RemoteJoinStatus;
};

export type RemoteBankRoom = {
  id: string;
  hostUserId: string;
  status: 'lobby' | 'active' | 'completed' | 'abandoned';
  state: BankGame;
  stateVersion: number;
  participants: RemoteBankParticipant[];
  expiresAt: string;
};

export type RemoteBankInvite = {
  participantId: string;
  token: string;
  code: string;
  expiresAt: string;
};

export type RemoteBankTableInvite = {
  token: string;
  code: string;
  expiresAt: string;
};

export type RemoteBankCommand = {
  sessionId: string;
  participantId: string;
  actionType: 'roll' | 'bank';
  expectedStateVersion: number;
  idempotencyKey: string;
};

export function canControlSeat(participant: RemoteBankParticipant, actorUserId: string, hostUserId: string) {
  if (participant.joinStatus === 'left') return false;
  if (participant.joinStatus === 'local' || participant.joinStatus === 'invited') return actorUserId === hostUserId && participant.controllerUserId === hostUserId;
  return participant.userId === actorUserId && participant.controllerUserId === actorUserId;
}

export function validateRemoteCommand(input: { expectedStateVersion: number; currentStateVersion: number; idempotencyKey: string }):
  { ok: true } | { ok: false; reason: 'state_conflict' | 'missing_idempotency_key' } {
  if (!input.idempotencyKey.trim()) return { ok: false, reason: 'missing_idempotency_key' };
  if (input.expectedStateVersion !== input.currentStateVersion) return { ok: false, reason: 'state_conflict' };
  return { ok: true };
}

export function createInviteUrl(origin: string, token: string) {
  const cleanOrigin = origin.replace(/\/$/, '');
  return `${cleanOrigin}${cleanOrigin.endsWith('://') ? '' : '/'}join/${encodeURIComponent(token)}`;
}

export function normalizeJoinCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const TABLE_MARK_COLORS = ['Amber', 'Blue', 'Coral', 'Green', 'Purple', 'Red'];

export function tableMarkForCode(code: string) {
  const normalized = normalizeJoinCode(code);
  const hash = [...normalized].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 7);
  const color = TABLE_MARK_COLORS[hash % TABLE_MARK_COLORS.length];
  const number = (Math.floor(hash / TABLE_MARK_COLORS.length) % 9) + 1;
  return `${color} ${number}`;
}
