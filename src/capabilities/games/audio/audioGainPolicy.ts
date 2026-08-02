export type AudioCategory =
  | 'ui.micro'
  | 'ui.outcome'
  | 'game.mechanic'
  | 'game.signature'
  | 'game.pattern'
  | 'game.music'
  | 'focus.music';

export type AudioMasteringPolicy = {
  targetLufs: number;
  allowedSpreadLu: number;
  truePeakCeilingDbtp: number;
  runtimeGain: number;
};

type AudioPolicyData = {
  categories: Record<AudioCategory, AudioMasteringPolicy>;
  transitions: {
    signatureDuck: { attenuationDb: number; attackMs: number; holdAfterCueMs: number; releaseMs: number };
    mechanicDuck: { attenuationDb: number; attackMs: number; holdAfterCueMs: number; releaseMs: number };
    musicCrossfadeMs: { min: number; max: number };
  };
};

const policyData = rawPolicy as AudioPolicyData;

export const AUDIO_GAIN_POLICY = policyData.categories;
export const AUDIO_MIX_TRANSITIONS = policyData.transitions;

export type MusicDuckKind = 'none' | 'mechanic' | 'signature';

export function audioGainForCategory(category: AudioCategory) {
  return AUDIO_GAIN_POLICY[category].runtimeGain;
}

function decibelsToLinearGain(decibels: number) {
  return 10 ** (decibels / 20);
}

export function duckedMusicGain(kind: MusicDuckKind) {
  const baseGain = audioGainForCategory('game.music');
  if (kind === 'none') return baseGain;
  const attenuationDb = kind === 'signature'
    ? AUDIO_MIX_TRANSITIONS.signatureDuck.attenuationDb
    : AUDIO_MIX_TRANSITIONS.mechanicDuck.attenuationDb;
  return baseGain * decibelsToLinearGain(attenuationDb);
}
import rawPolicy from './audioGainPolicy.json';
