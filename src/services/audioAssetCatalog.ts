import type { AudioCategory } from '@/src/capabilities/games/audio/audioGainPolicy';

const PUBLIC_AUDIO_ROOT = 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/audio_assets/v1';

export type RemoteAudioAssetId =
  | 'focus.copacabana'
  | 'focus.focus-tunnel'
  | 'focus.midnight-study'
  | 'focus.open-road'
  | 'focus.cedar-workshop'
  | 'focus.rainlit-library'
  | 'focus.quiet-rain'
  | 'focus.forest-stream'
  | 'focus.ocean-waves'
  | 'focus.fireplace'
  | 'focus.night-meadow'
  | 'game.story-relay'
  | 'game.clue-circle'
  | 'game.slanguage'
  | 'game.bank-initial'
  | 'game.bank-building'
  | 'game.bank-maximum';

export type RemoteAudioAsset = {
  id: RemoteAudioAssetId;
  url: string;
  cacheFileName: string;
  expectedBytes: number;
  category: Extract<AudioCategory, 'focus.music' | 'game.music'>;
};

function asset(
  id: RemoteAudioAssetId,
  relativePath: string,
  expectedBytes: number,
  category: RemoteAudioAsset['category'],
): RemoteAudioAsset {
  return {
    id,
    url: `${PUBLIC_AUDIO_ROOT}/${relativePath}`,
    cacheFileName: relativePath.replaceAll('/', '-'),
    expectedBytes,
    category,
  };
}

export const REMOTE_AUDIO_ASSETS: Record<RemoteAudioAssetId, RemoteAudioAsset> = {
  'focus.copacabana': asset('focus.copacabana', 'focus/copacabana-focus-9714caeb0913.mp3', 5_376_428, 'focus.music'),
  'focus.focus-tunnel': asset('focus.focus-tunnel', 'focus/focus-tunnel-36e2e0d5c498.mp3', 5_569_964, 'focus.music'),
  'focus.midnight-study': asset('focus.midnight-study', 'focus/midnight-study-f415ecb449e4.mp3', 5_041_772, 'focus.music'),
  'focus.open-road': asset('focus.open-road', 'focus/open-road-focus-707dfde8b7ee.mp3', 4_394_348, 'focus.music'),
  'focus.cedar-workshop': asset('focus.cedar-workshop', 'focus/cedar-workshop-56a9047ea7ae.mp3', 4_033_772, 'focus.music'),
  'focus.rainlit-library': asset('focus.rainlit-library', 'focus/rainlit-library-f28fdc597fd5.mp3', 4_028_588, 'focus.music'),
  'focus.quiet-rain': asset('focus.quiet-rain', 'focus/quiet-rain-90631c045614.mp3', 5_569_388, 'focus.music'),
  'focus.forest-stream': asset('focus.forest-stream', 'focus/forest-stream-96a2d1cccd42.mp3', 5_569_388, 'focus.music'),
  'focus.ocean-waves': asset('focus.ocean-waves', 'focus/ocean-waves-1bc54848be4d.mp3', 5_377_580, 'focus.music'),
  'focus.fireplace': asset('focus.fireplace', 'focus/fireplace-437701bb0f20.mp3', 5_569_388, 'focus.music'),
  'focus.night-meadow': asset('focus.night-meadow', 'focus/night-meadow-652815cb09d9.mp3', 5_569_388, 'focus.music'),
  'game.story-relay': asset('game.story-relay', 'games/story-relay-a63e69918b9c.mp3', 1_441_871, 'game.music'),
  'game.clue-circle': asset('game.clue-circle', 'games/clue-circle-f11ae524d433.mp3', 1_441_871, 'game.music'),
  'game.slanguage': asset('game.slanguage', 'games/slanguage-b4848a867f22.mp3', 1_441_871, 'game.music'),
  'game.bank-initial': asset('game.bank-initial', 'games/bank-initial-9d384641ba20.mp3', 1_441_871, 'game.music'),
  'game.bank-building': asset('game.bank-building', 'games/bank-building-80c059ab399e.mp3', 1_441_871, 'game.music'),
  'game.bank-maximum': asset('game.bank-maximum', 'games/bank-maximum-b04a34eb7fd2.mp3', 1_425_743, 'game.music'),
};

export function remoteAudioAsset(id: RemoteAudioAssetId) {
  return REMOTE_AUDIO_ASSETS[id];
}
