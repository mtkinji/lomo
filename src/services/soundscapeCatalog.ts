export type SoundscapeId =
  | 'default'
  | 'focusFlowState'
  | 'midnightStudySession'
  | 'copacabanaFocus'
  | 'openRoadFocus'
  | 'cedarWorkshop'
  | 'rainlitLibrary'
  | 'quietRain'
  | 'forestStream'
  | 'oceanWaves'
  | 'fireplace'
  | 'nightMeadow';

export type SoundscapeKind = 'music' | 'nature';
export type Soundscape = { id: SoundscapeId; title: string; kind: SoundscapeKind };

export const SOUND_SCAPES: Soundscape[] = [
  { id: 'default', title: 'Deep Work Drift', kind: 'music' },
  { id: 'copacabanaFocus', title: 'Copacabana', kind: 'music' },
  { id: 'focusFlowState', title: 'Focus Tunnel', kind: 'music' },
  { id: 'midnightStudySession', title: 'Midnight Study', kind: 'music' },
  { id: 'openRoadFocus', title: 'Open Road', kind: 'music' },
  { id: 'cedarWorkshop', title: 'Cedar Workshop', kind: 'music' },
  { id: 'rainlitLibrary', title: 'Rainlit Library', kind: 'music' },
  { id: 'quietRain', title: 'Quiet Rain', kind: 'nature' },
  { id: 'forestStream', title: 'Forest Stream', kind: 'nature' },
  { id: 'oceanWaves', title: 'Ocean Waves', kind: 'nature' },
  { id: 'fireplace', title: 'Fireplace', kind: 'nature' },
  { id: 'nightMeadow', title: 'Night Meadow', kind: 'nature' },
];

const SOUNDSCAPE_SECTIONS: Array<{ kind: SoundscapeKind; title: string }> = [
  { kind: 'music', title: 'Music' },
  { kind: 'nature', title: 'Nature' },
];

export function soundscapesByKind() {
  return SOUNDSCAPE_SECTIONS.map((section) => ({
    ...section,
    soundscapes: SOUND_SCAPES.filter((soundscape) => soundscape.kind === section.kind),
  })).filter((section) => section.soundscapes.length > 0);
}

export function isSoundscapeId(value: unknown): value is SoundscapeId {
  return typeof value === 'string' && SOUND_SCAPES.some((item) => item.id === value);
}
