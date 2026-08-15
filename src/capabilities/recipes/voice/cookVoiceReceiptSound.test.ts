const mockPlayer = {
  volume: 0,
  seekTo: jest.fn(async () => undefined),
  play: jest.fn(),
};
const mockCreateAudioPlayer = jest.fn(() => mockPlayer);
const mockSetAudioModeAsync = jest.fn(async () => undefined);

jest.mock('expo-audio', () => ({
  createAudioPlayer: mockCreateAudioPlayer,
  setAudioModeAsync: mockSetAudioModeAsync,
}));

describe('Cook voice receipt sound', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockPlayer.volume = 0;
  });

  it('reuses one short cue player and restores playback mode for every received turn', async () => {
    const { playCookVoiceReceiptSound } =
      require('./cookVoiceReceiptSound') as typeof import('./cookVoiceReceiptSound');

    await playCookVoiceReceiptSound();
    await playCookVoiceReceiptSound();

    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
    expect(mockSetAudioModeAsync).toHaveBeenCalledTimes(3);
    expect(mockSetAudioModeAsync).toHaveBeenLastCalledWith(expect.objectContaining({
      allowsRecording: false,
      playsInSilentMode: true,
    }));
    expect(mockPlayer.seekTo).toHaveBeenCalledTimes(2);
    expect(mockPlayer.play).toHaveBeenCalledTimes(2);
  });
});
