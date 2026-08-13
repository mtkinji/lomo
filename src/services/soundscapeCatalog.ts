export type SoundscapeId =
  | 'default'
  | 'focusFlowState'
  | 'midnightStudySession'
  | 'copacabanaFocus'
  | 'openRoadFocus'
  | 'cedarWorkshop'
  | 'rainlitLibrary'
  | 'quietRain'
  | 'canyonSpring'
  | 'oceanWaves'
  | 'fireplace';

export type Soundscape = { id: SoundscapeId; title: string };
export type FocusVideoEnvironmentId = Extract<SoundscapeId, 'canyonSpring'>;

export const SOUND_SCAPES: Soundscape[] = [
  { id: 'default', title: 'Deep Work Drift' },
  { id: 'copacabanaFocus', title: 'Copacabana' },
  { id: 'focusFlowState', title: 'Focus Tunnel' },
  { id: 'midnightStudySession', title: 'Midnight Study' },
  { id: 'openRoadFocus', title: 'Open Road' },
  { id: 'cedarWorkshop', title: 'Cedar Workshop' },
  { id: 'rainlitLibrary', title: 'Rainlit Library' },
  { id: 'quietRain', title: 'Quiet Rain' },
  { id: 'canyonSpring', title: 'Canyon Spring' },
  { id: 'oceanWaves', title: 'Ocean Waves' },
  { id: 'fireplace', title: 'Fireplace' },
];

export function isSoundscapeId(value: unknown): value is SoundscapeId {
  return typeof value === 'string' && SOUND_SCAPES.some((item) => item.id === value);
}

export function normalizeSoundscapeId(value: unknown): SoundscapeId {
  if (value === 'forestStream' || value === 'nightMeadow') return 'quietRain';
  return isSoundscapeId(value) ? value : 'default';
}

export function normalizeFocusVideoEnvironmentId(value: unknown): FocusVideoEnvironmentId | null {
  return value === 'canyonSpring' ? value : null;
}
