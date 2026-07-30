import { defaultPlayerIdentity, normalizePlayerIdentity, type PlayerIdentity } from './playerIdentity';
import type { SavedPlayer } from './savedPlayers';
import type { GamePlayerProfile } from './gamePlayerProfile';

export type PlayerSeat = { key: string; savedPlayerId?: string; profileUserId?: string; displayName: string; identity?: PlayerIdentity };

type HydrateSeat<T extends PlayerSeat> = (seat: T, player: SavedPlayer, index: number) => T;
type SeatSelectionLimits = { minSeats?: number; maxSeats?: number };

const defaultHydrate = <T extends PlayerSeat>(seat: T, player: SavedPlayer) => ({
  ...seat,
  profileUserId: undefined,
  savedPlayerId: player.id,
  displayName: player.displayName,
});

export function toggleSavedPlayerSeat<T extends PlayerSeat>(
  seats: T[],
  player: SavedPlayer,
  createSeat: () => T,
  hydrate: HydrateSeat<T> = defaultHydrate,
  limits: SeatSelectionLimits = {},
): T[] {
  const minSeats = limits.minSeats ?? 2;
  const maxSeats = limits.maxSeats ?? 6;
  const selectedIndex = seats.findIndex((seat) => seat.savedPlayerId === player.id);
  if (selectedIndex >= 0) {
    if (seats.length > minSeats) return seats.filter((_, index) => index !== selectedIndex);
    return seats.map((seat, index) => index === selectedIndex
      ? { ...seat, savedPlayerId: undefined, profileUserId: undefined, displayName: '' }
      : seat);
  }

  const blankIndex = seats.findIndex((seat) => !seat.displayName.trim());
  if (blankIndex >= 0) return seats.map((seat, index) => index === blankIndex ? hydrate(seat, player, index) : seat);
  if (seats.length < maxSeats) return [...seats, hydrate(createSeat(), player, seats.length)];
  if (maxSeats === 1 && seats.length === 1) return [hydrate(seats[0], player, 0)];
  return seats;
}

export function toggleProfileSeat<T extends PlayerSeat>(seats: T[], profile: GamePlayerProfile, createSeat: () => T, limits: SeatSelectionLimits = {}): T[] {
  const minSeats = limits.minSeats ?? 2;
  const maxSeats = limits.maxSeats ?? 6;
  const selectedIndex = seats.findIndex((seat) => seat.profileUserId === profile.userId);
  if (selectedIndex >= 0) {
    if (seats.length > minSeats) return seats.filter((_, index) => index !== selectedIndex);
    return seats.map((seat, index) => index === selectedIndex
      ? { ...seat, profileUserId: undefined, displayName: '', identity: undefined }
      : seat);
  }

  const hydrate = (seat: T): T => ({
    ...seat,
    savedPlayerId: undefined,
    profileUserId: profile.userId,
    displayName: profile.displayName,
    identity: normalizePlayerIdentity(profile.identity),
  });
  const blankIndex = seats.findIndex((seat) => !seat.displayName.trim());
  if (blankIndex >= 0) return seats.map((seat, index) => index === blankIndex ? hydrate(seat) : seat);
  if (seats.length < maxSeats) return [...seats, hydrate(createSeat())];
  if (maxSeats === 1 && seats.length === 1) return [hydrate(seats[0])];
  return seats;
}

export function identityForSeats(seats: PlayerSeat[], players: SavedPlayer[]): PlayerIdentity[] {
  return seats.map((seat, index) => {
    const saved = seat.savedPlayerId ? players.find((player) => player.id === seat.savedPlayerId) : undefined;
    return normalizePlayerIdentity(seat.identity ?? saved?.identity ?? defaultPlayerIdentity(index), index);
  });
}

export function renameSeatSelection<T extends PlayerSeat>(seats: T[], id: string, displayName: string): T[] {
  return seats.map((seat) => seat.savedPlayerId === id ? { ...seat, displayName } : seat);
}

export function archiveSeatSelection<T extends PlayerSeat>(seats: T[], id: string): T[] {
  if (!seats.some((seat) => seat.savedPlayerId === id)) return seats;
  if (seats.length > 2) return seats.filter((seat) => seat.savedPlayerId !== id);
  return seats.map((seat) => seat.savedPlayerId === id
    ? { ...seat, savedPlayerId: undefined, displayName: '' }
    : seat);
}
