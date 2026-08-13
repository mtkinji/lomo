import { useEffect, useRef } from 'react';
import type { AudioPlayer } from 'expo-audio';
import { resolveAudioAsset } from '@/src/services/audioAssetDelivery';
import type { RemoteAudioAssetId } from '@/src/services/audioAssetCatalog';
import { audioGainForCategory } from './audioGainPolicy';

const MUSIC_GAIN = audioGainForCategory('game.music');
const FADE_STEPS = 7;
const FADE_STEP_MS = 60;

type MusicPlayer = Pick<AudioPlayer, 'playing' | 'volume' | 'loop' | 'pause' | 'replace' | 'play'>;

async function fadePlayer(
  player: MusicPlayer,
  from: number,
  to: number,
  active: () => boolean,
  sleep: (ms: number) => Promise<void>,
) {
  for (let step = 1; step <= FADE_STEPS; step += 1) {
    if (!active()) return false;
    const progress = step / FADE_STEPS;
    player.volume = from + (to - from) * progress;
    await sleep(FADE_STEP_MS);
  }
  return true;
}

export async function applyGameMusicTransition(
  player: MusicPlayer,
  trackId: RemoteAudioAssetId | null,
  enabled: boolean,
  active: () => boolean = () => true,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
) {
  if (!enabled || !trackId) {
    if (player.playing) await fadePlayer(player, player.volume, 0, active, sleep);
    if (active()) player.pause();
    return;
  }

  // Keep the current loop alive while the next remote-backed track resolves.
  // If resolution fails, the caller can swallow the error without leaving the table silent.
  const resolved = await resolveAudioAsset(trackId);
  if (!active()) return;

  if (player.playing) {
    const faded = await fadePlayer(player, player.volume, 0, active, sleep);
    if (!faded) return;
    player.pause();
  }

  if (!active()) return;
  player.replace({ uri: resolved.uri });
  player.loop = true;
  player.volume = 0;
  player.play();
  await fadePlayer(player, 0, MUSIC_GAIN, active, sleep);
}

export function useGameMusic(trackId: RemoteAudioAssetId | null, enabled = true) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const operation = useRef(0);

  useEffect(() => {
    const op = ++operation.current;
    let disposed = false;

    const update = async () => {
      const runtime = await import('./gameAudioRuntime');
      await runtime.configureGameAudio();
      if (disposed || op !== operation.current) return;
      const player = playerRef.current ?? runtime.createGameMusicPlayer();
      playerRef.current = player;
      await applyGameMusicTransition(player, trackId, enabled, () => !disposed && op === operation.current);
    };

    void update().catch(() => undefined);
    return () => {
      disposed = true;
      if (operation.current === op) operation.current += 1;
    };
  }, [enabled, trackId]);

  useEffect(() => () => {
    operation.current += 1;
    playerRef.current?.pause();
    playerRef.current?.remove();
    playerRef.current = null;
  }, []);
}
