const mockPlayers: Array<{
  volume: number;
  seekTo: jest.Mock<Promise<void>, [number]>;
  play: jest.Mock<void, []>;
  remove: jest.Mock<void, []>;
}> = [];

const mockCreateAudioPlayer = jest.fn(() => {
  const player = {
    volume: 0,
    seekTo: jest.fn(async (_seconds: number) => undefined),
    play: jest.fn(),
    remove: jest.fn(),
  };
  mockPlayers.push(player);
  return player;
});
const mockSetAudioModeAsync = jest.fn(async () => undefined);

jest.mock('expo-audio', () => ({
  createAudioPlayer: mockCreateAudioPlayer,
  setAudioModeAsync: mockSetAudioModeAsync,
}));

describe('UI sounds', () => {
  beforeEach(() => {
    jest.resetModules();
    mockPlayers.length = 0;
    mockCreateAudioPlayer.mockClear();
    mockSetAudioModeAsync.mockClear();
  });

  test('caches a player and replays each tap from the beginning', async () => {
    const { playStepDoneSound } = require('./uiSounds') as typeof import('./uiSounds');

    await playStepDoneSound();
    await playStepDoneSound();

    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
    expect(mockPlayers[0]?.volume).toBe(0.95);
    expect(mockPlayers[0]?.seekTo).toHaveBeenNthCalledWith(1, 0);
    expect(mockPlayers[0]?.seekTo).toHaveBeenNthCalledWith(2, 0);
    expect(mockPlayers[0]?.play).toHaveBeenCalledTimes(2);
  });

  test('releases cached native players when unloaded', async () => {
    const { playStepDoneSound, playActivityDoneSound, unloadUiSounds } =
      require('./uiSounds') as typeof import('./uiSounds');

    await playStepDoneSound();
    await playActivityDoneSound();
    await unloadUiSounds();

    expect(mockPlayers).toHaveLength(2);
    expect(mockPlayers[0]?.remove).toHaveBeenCalledTimes(1);
    expect(mockPlayers[1]?.remove).toHaveBeenCalledTimes(1);
  });
});
