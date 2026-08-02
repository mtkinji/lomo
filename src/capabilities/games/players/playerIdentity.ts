export const PLAYER_COLORS = [
  { id: 'turmeric', label: 'Sunshine', value: '#F8CF52', text: '#201D18' },
  { id: 'coral', label: 'Coral', value: '#FF684B', text: '#201D18' },
  { id: 'mint', label: 'Mint', value: '#63B89C', text: '#102D25' },
  { id: 'violet', label: 'Violet', value: '#A98BE8', text: '#201D18' },
  { id: 'sky', label: 'Sky', value: '#65B7E8', text: '#102733' },
  { id: 'rose', label: 'Rose', value: '#D889B2', text: '#321322' },
] as const;

export const SUCCESS_SOUNDS = [
  { id: 'chime', label: 'Chime' },
  { id: 'sparkle', label: 'Sparkle' },
  { id: 'fanfare', label: 'Fanfare' },
  { id: 'hawk', label: 'Majestic eagle' },
  { id: 'power-lick-1', label: 'Power lick I' },
  { id: 'power-lick-2', label: 'Power lick II' },
  { id: 'power-lick-3', label: 'Power lick III' },
  { id: 'banjo-run-1', label: 'Banjo run' },
  { id: 'tiny-crowd-1', label: 'Tiny crowd I' },
  { id: 'tiny-crowd-2', label: 'Tiny crowd II' },
  { id: 'tiny-crowd-3', label: 'Tiny crowd III' },
  { id: 'tiny-crowd-4', label: 'Tiny crowd IV' },
] as const;

export const FAILURE_SOUNDS = [
  { id: 'trombone', label: 'Trombone' },
  { id: 'bonk', label: 'Bonk' },
  { id: 'wobble', label: 'Wobble' },
  { id: 'cartoon-splat', label: 'Cartoon splat' },
] as const;

export type PlayerColorId = typeof PLAYER_COLORS[number]['id'];
export type SuccessSoundId = typeof SUCCESS_SOUNDS[number]['id'];
export type FailureSoundId = typeof FAILURE_SOUNDS[number]['id'];
export type PlayerIdentity = {
  colorId: PlayerColorId;
  successSoundId: SuccessSoundId;
  failureSoundId: FailureSoundId;
};

export function defaultPlayerIdentity(index: number): PlayerIdentity {
  return {
    colorId: PLAYER_COLORS[((index % PLAYER_COLORS.length) + PLAYER_COLORS.length) % PLAYER_COLORS.length].id,
    successSoundId: 'chime',
    failureSoundId: 'trombone',
  };
}

type PersistedPlayerIdentity = Partial<Record<keyof PlayerIdentity, string | null>>;

export function normalizePlayerIdentity(value: PersistedPlayerIdentity | null | undefined, index = 0): PlayerIdentity {
  const fallback = defaultPlayerIdentity(index);
  return {
    colorId: PLAYER_COLORS.find((choice) => choice.id === value?.colorId)?.id ?? fallback.colorId,
    successSoundId: SUCCESS_SOUNDS.find((choice) => choice.id === value?.successSoundId)?.id ?? fallback.successSoundId,
    failureSoundId: FAILURE_SOUNDS.find((choice) => choice.id === value?.failureSoundId)?.id ?? fallback.failureSoundId,
  };
}

export function playerColor(id: PlayerColorId) {
  return PLAYER_COLORS.find((choice) => choice.id === id)?.value ?? PLAYER_COLORS[0].value;
}

export function playerColorText(id: PlayerColorId) {
  return PLAYER_COLORS.find((choice) => choice.id === id)?.text ?? PLAYER_COLORS[0].text;
}
