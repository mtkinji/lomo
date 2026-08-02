import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

export function configureGameAudio() {
  return setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
}

export function createGameMusicPlayer() {
  return createAudioPlayer(null, { keepAudioSessionActive: true });
}
