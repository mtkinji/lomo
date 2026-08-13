import type { PlayerSeat } from './playerSeats';

export type PersonalBestGameKey = 'bank' | 'farkle';
export type PersonalBestPlayerKey = `profile:${string}` | `saved:${string}`;

export type PersonalBest = {
  playerKey: PersonalBestPlayerKey;
  gameKey: PersonalBestGameKey;
  score: number;
  achievedAt: string;
  updatedAt: string;
};

export type PersonalBestOutcome = {
  playerKey: PersonalBestPlayerKey;
  previousBest: number | null;
  bestScore: number;
  isNewBest: boolean;
  matchedBest: boolean;
};

type ScoredSeat = Pick<PlayerSeat, 'profileUserId' | 'savedPlayerId' | 'displayName'> & { score: number };

const recordKey = (record: Pick<PersonalBest, 'playerKey' | 'gameKey'>) => `${record.playerKey}|${record.gameKey}`;

export function playerBestKey(seat: Pick<PlayerSeat, 'profileUserId' | 'savedPlayerId' | 'displayName'>): PersonalBestPlayerKey | null {
  if (seat.profileUserId) return `profile:${seat.profileUserId}`;
  if (seat.savedPlayerId) return `saved:${seat.savedPlayerId}`;
  return null;
}

export function personalBestFor(records: PersonalBest[], gameKey: PersonalBestGameKey, seat: Pick<PlayerSeat, 'profileUserId' | 'savedPlayerId' | 'displayName'>) {
  const playerKey = playerBestKey(seat);
  return playerKey ? records.find((record) => record.playerKey === playerKey && record.gameKey === gameKey)?.score ?? null : null;
}

export function allTimeBestForGame(records: PersonalBest[], gameKey: PersonalBestGameKey) {
  const scores = records.filter((record) => record.gameKey === gameKey).map((record) => record.score);
  return scores.length ? Math.max(...scores) : null;
}

export function mergePersonalBests(...collections: PersonalBest[][]): PersonalBest[] {
  const merged = new Map<string, PersonalBest>();
  collections.flat().forEach((record) => {
    const key = recordKey(record);
    const current = merged.get(key);
    if (!current || record.score > current.score || (record.score === current.score && record.updatedAt > current.updatedAt)) {
      merged.set(key, record);
    }
  });
  return [...merged.values()].sort((left, right) => recordKey(left).localeCompare(recordKey(right)));
}

export function recordPersonalBests(records: PersonalBest[], gameKey: PersonalBestGameKey, seats: ScoredSeat[], now: string) {
  let next = records;
  const outcomes: PersonalBestOutcome[] = [];

  seats.forEach((seat) => {
    const playerKey = playerBestKey(seat);
    if (!playerKey || !Number.isFinite(seat.score) || seat.score < 0) return;
    const current = next.find((record) => record.playerKey === playerKey && record.gameKey === gameKey);
    const isNewBest = !current || seat.score > current.score;
    outcomes.push({
      playerKey,
      previousBest: current?.score ?? null,
      bestScore: Math.max(current?.score ?? 0, seat.score),
      isNewBest,
      matchedBest: !!current && seat.score === current.score,
    });
    if (isNewBest) {
      next = mergePersonalBests(next, [{ playerKey, gameKey, score: seat.score, achievedAt: now, updatedAt: now }]);
    }
  });

  return { records: next, outcomes };
}
