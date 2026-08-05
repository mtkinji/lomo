export type SoundscapeId =
  | 'default'
  | 'focusFlowState'
  | 'midnightStudySession'
  | 'copacabanaFocus'
  | 'openRoadFocus'
  | 'cedarWorkshop'
  | 'rainlitLibrary';

export const SOUND_SCAPES: Array<{ id: SoundscapeId; title: string }> = [
  { id: 'default', title: 'Deep Work Drift' },
  { id: 'copacabanaFocus', title: 'Copacabana' },
  { id: 'focusFlowState', title: 'Focus Tunnel' },
  { id: 'midnightStudySession', title: 'Midnight Study' },
  { id: 'openRoadFocus', title: 'Open Road' },
  { id: 'cedarWorkshop', title: 'Cedar Workshop' },
  { id: 'rainlitLibrary', title: 'Rainlit Library' },
];

export function isSoundscapeId(value: unknown): value is SoundscapeId {
  return typeof value === 'string' && SOUND_SCAPES.some((item) => item.id === value);
}
