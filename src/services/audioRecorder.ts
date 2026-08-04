import {
  AudioModule,
  type AudioRecorder,
  type RecordingOptions,
} from 'expo-audio';
import { Platform } from 'react-native';

/**
 * Creates an imperative recorder with the platform-specific option shape that
 * expo-audio's native constructor expects. The public hook performs this same
 * flattening internally, but these service modules cannot use React hooks.
 */
export function createAudioRecorder(
  options: RecordingOptions,
  overrides?: Pick<RecordingOptions, 'isMeteringEnabled'>,
): AudioRecorder {
  const common = {
    extension: options.extension,
    sampleRate: options.sampleRate,
    numberOfChannels: options.numberOfChannels,
    bitRate: options.bitRate,
    isMeteringEnabled: overrides?.isMeteringEnabled ?? options.isMeteringEnabled ?? false,
  };
  const platformOptions = Platform.OS === 'ios'
    ? options.ios
    : Platform.OS === 'android'
      ? options.android
      : options.web;

  return new AudioModule.AudioRecorder({
    ...common,
    ...platformOptions,
  } as Partial<RecordingOptions>);
}

export async function createPreparedAudioRecorder(
  options: RecordingOptions,
  overrides?: Pick<RecordingOptions, 'isMeteringEnabled'>,
): Promise<AudioRecorder> {
  const recorder = createAudioRecorder(options, overrides);
  try {
    await recorder.prepareToRecordAsync();
    return recorder;
  } catch (error) {
    recorder.release();
    throw error;
  }
}
