export type GameMode = 'roller' | 'bank' | 'farkle';

export const gameModes: GameMode[] = ['roller', 'bank', 'farkle'];

export function gameModeLabel(mode: GameMode) {
  return mode === 'roller' ? 'Basic Dice Roller' : mode === 'bank' ? 'Bank' : 'Farkle';
}

export function parseGameMode(value: unknown): GameMode {
  return value === 'bank' || value === 'farkle' ? value : 'roller';
}
