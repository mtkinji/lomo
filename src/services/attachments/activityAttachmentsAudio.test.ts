jest.mock('expo-audio', () => ({
  AudioModule: { AudioRecorder: jest.fn() },
  RecordingPresets: { HIGH_QUALITY: {} },
  requestRecordingPermissionsAsync: jest.fn(),
  setAudioModeAsync: jest.fn(),
}));

import { audioRecordingDurationSeconds } from './activityAttachments';

describe('activity attachment audio metadata', () => {
  test.each([
    [undefined, null],
    [Number.NaN, null],
    [-1, null],
    [0, 0],
    [120, 1],
    [1_490, 1],
    [1_500, 2],
    [61_200, 61],
  ])('converts recorder duration %p ms to %p seconds', (durationMillis, expected) => {
    expect(audioRecordingDurationSeconds(durationMillis)).toBe(expected);
  });
});
