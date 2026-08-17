import admissionsJson from '../../assets/audio/SOUNDSCAPE_LOOP_ADMISSION.json';
import type { FocusRemoteAudioAssetId } from './audioAssetCatalog';

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

export type BundledSoundscapeKey = 'deep-work-drift' | 'canyon-spring';

export type SoundscapeLoopAdmission = {
  id: SoundscapeId;
  assetKey: string;
  source:
    | { kind: 'bundled'; key: BundledSoundscapeKey; module: number }
    | { kind: 'remote'; id: FocusRemoteAudioAssetId };
  loopPlayback: 'seamless';
  sampleRateHz: 48_000;
  channels: 2;
};

export type Soundscape = { id: SoundscapeId; title: string; loop: SoundscapeLoopAdmission };
export type FocusVideoEnvironmentId = Extract<SoundscapeId, 'canyonSpring'>;

type SerializedAdmission = Omit<SoundscapeLoopAdmission, 'source'> & {
  source:
    | { kind: 'bundled'; key: BundledSoundscapeKey }
    | { kind: 'remote'; id: FocusRemoteAudioAssetId };
};

const BUNDLED_SOUNDSCAPE_MODULES: Record<BundledSoundscapeKey, number> = {
  'deep-work-drift': require('../../assets/audio/soundscapes/deep-work-drift-loop-c24a34f97230.mp3'),
  'canyon-spring': require('../../assets/audio/soundscapes/canyon-spring-stream-7e21d76f632c.mp3'),
};

const admissions = admissionsJson as SerializedAdmission[];
const admissionById = new Map<SoundscapeId, SoundscapeLoopAdmission>(
  admissions.map((admission) => [
    admission.id,
    {
      ...admission,
      source: admission.source.kind === 'bundled'
        ? { ...admission.source, module: BUNDLED_SOUNDSCAPE_MODULES[admission.source.key] }
        : admission.source,
    },
  ]),
);

function admitted(id: SoundscapeId): SoundscapeLoopAdmission {
  const admission = admissionById.get(id);
  if (!admission) throw new Error(`Missing seamless loop admission for ${id}`);
  return admission;
}

export const SOUND_SCAPES: Soundscape[] = [
  { id: 'default', title: 'Deep Work Drift', loop: admitted('default') },
  { id: 'copacabanaFocus', title: 'Copacabana', loop: admitted('copacabanaFocus') },
  { id: 'focusFlowState', title: 'Focus Tunnel', loop: admitted('focusFlowState') },
  { id: 'midnightStudySession', title: 'Midnight Study', loop: admitted('midnightStudySession') },
  { id: 'openRoadFocus', title: 'Open Road', loop: admitted('openRoadFocus') },
  { id: 'cedarWorkshop', title: 'Cedar Workshop', loop: admitted('cedarWorkshop') },
  { id: 'rainlitLibrary', title: 'Rainlit Library', loop: admitted('rainlitLibrary') },
  { id: 'quietRain', title: 'Quiet Rain', loop: admitted('quietRain') },
  { id: 'canyonSpring', title: 'Canyon Spring', loop: admitted('canyonSpring') },
  { id: 'oceanWaves', title: 'Ocean Waves', loop: admitted('oceanWaves') },
  { id: 'fireplace', title: 'Fireplace', loop: admitted('fireplace') },
];

export function soundscapeLoopAdmission(id: SoundscapeId): SoundscapeLoopAdmission {
  return admitted(id);
}

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
