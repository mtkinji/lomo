const mockRecorder = {
  uri: 'file:///voice.m4a',
  prepareToRecordAsync: jest.fn(async () => undefined),
  record: jest.fn(),
  stop: jest.fn(async () => undefined),
  release: jest.fn(),
  getStatus: jest.fn(() => ({ isRecording: true, metering: -20, durationMillis: 500 })),
};
const mockAudioRecorder = jest.fn(() => mockRecorder);
const mockRequestRecordingPermissionsAsync = jest.fn(async () => ({ granted: true }));
const mockSetAudioModeAsync = jest.fn(async () => undefined);
const mockFileBase64 = jest.fn(async () => 'base64-audio');

jest.mock('expo-audio', () => ({
  AudioModule: { AudioRecorder: mockAudioRecorder },
  RecordingPresets: {
    HIGH_QUALITY: {
      extension: '.m4a', sampleRate: 44_100, numberOfChannels: 2, bitRate: 128_000,
      ios: { outputFormat: 'ios-aac' }, android: { outputFormat: 'mpeg4' }, web: {},
    },
  },
  requestRecordingPermissionsAsync: mockRequestRecordingPermissionsAsync,
  setAudioModeAsync: mockSetAudioModeAsync,
}));

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((uri: string) => ({
    uri,
    exists: true,
    size: 1024,
    base64: mockFileBase64,
  })),
}));

jest.mock('../../services/backend/auth', () => ({ getAccessToken: jest.fn(async () => 'token') }));
jest.mock('../../services/edgeFunctions', () => ({
  getEdgeFunctionUrl: jest.fn(() => 'https://example.test/transcribe'),
  getEdgeFunctionUrlCandidates: jest.fn(() => ['https://example.test/transcribe']),
}));
jest.mock('../../services/installId', () => ({ getInstallId: jest.fn(async () => 'install-id') }));
jest.mock('../../utils/getEnv', () => ({ getSupabasePublishableKey: jest.fn(() => 'key') }));

describe('Unified Chat native voice recording', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockRequestRecordingPermissionsAsync.mockResolvedValue({ granted: true });
    mockRecorder.getStatus.mockReturnValue({
      isRecording: true,
      metering: -20,
      durationMillis: 500,
    });
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ transcript: 'Recorded thought' }),
    })) as jest.Mock;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('rejects recording when microphone permission is denied', async () => {
    mockRequestRecordingPermissionsAsync.mockResolvedValueOnce({ granted: false });
    const { startUnifiedChatVoiceRecording } =
      require('./unifiedChatVoice') as typeof import('./unifiedChatVoice');

    await expect(startUnifiedChatVoiceRecording()).rejects.toThrow(
      'Allow microphone access to use voice input.',
    );
    expect(mockAudioRecorder).not.toHaveBeenCalled();
  });

  test('releases the native recorder when preparation fails', async () => {
    mockRecorder.prepareToRecordAsync.mockRejectedValueOnce(new Error('prepare failed'));
    const { startUnifiedChatVoiceRecording } =
      require('./unifiedChatVoice') as typeof import('./unifiedChatVoice');

    await expect(startUnifiedChatVoiceRecording()).rejects.toThrow('prepare failed');
    expect(mockRecorder.release).toHaveBeenCalledTimes(1);
  });

  test('polls normalized metering while recording and stops polling when cancelled', async () => {
    const onLevel = jest.fn();
    const { startUnifiedChatVoiceRecording, cancelUnifiedChatVoiceRecording } =
      require('./unifiedChatVoice') as typeof import('./unifiedChatVoice');

    await startUnifiedChatVoiceRecording(onLevel);
    jest.advanceTimersByTime(100);

    expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalled();
    expect(mockAudioRecorder).toHaveBeenCalledWith(expect.objectContaining({
      extension: '.m4a',
      isMeteringEnabled: true,
      outputFormat: 'ios-aac',
    }));
    expect(mockRecorder.record).toHaveBeenCalledTimes(1);
    expect(onLevel).toHaveBeenCalledTimes(1);

    await cancelUnifiedChatVoiceRecording();
    jest.advanceTimersByTime(200);
    expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
    expect(onLevel).toHaveBeenCalledTimes(1);
  });

  test('transcribes the URI produced by the stopped recorder', async () => {
    const { startUnifiedChatVoiceRecording, stopAndTranscribeUnifiedChatVoice } =
      require('./unifiedChatVoice') as typeof import('./unifiedChatVoice');

    await startUnifiedChatVoiceRecording();
    await expect(stopAndTranscribeUnifiedChatVoice()).resolves.toBe('Recorded thought');

    expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
    expect(mockFileBase64).toHaveBeenCalledTimes(1);
  });
});
