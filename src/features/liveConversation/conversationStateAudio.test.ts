import { createConversationStateAudio } from './conversationStateAudio';

describe('conversation state audio', () => {
  it('replays one restrained bundled receipt without replacing the live audio session', async () => {
    const player = {
      volume: 0,
      seekTo: jest.fn(async () => undefined),
      play: jest.fn(),
      pause: jest.fn(),
      remove: jest.fn(),
    };
    const createPlayer = jest.fn(() => player);
    const audio = createConversationStateAudio({
      source: 'turn-received.wav',
      gain: 0.42,
      createPlayer,
    });

    await audio.playTurnReceived();
    await audio.playTurnReceived();

    expect(createPlayer).toHaveBeenCalledTimes(1);
    expect(createPlayer).toHaveBeenCalledWith('turn-received.wav', { keepAudioSessionActive: true });
    expect(player.volume).toBe(0.42);
    expect(player.seekTo).toHaveBeenNthCalledWith(1, 0);
    expect(player.seekTo).toHaveBeenNthCalledWith(2, 0);
    expect(player.play).toHaveBeenCalledTimes(2);
  });

  it('can stop and unload the receipt independently of final speech', async () => {
    const player = {
      volume: 0,
      seekTo: jest.fn(async () => undefined),
      play: jest.fn(),
      pause: jest.fn(),
      remove: jest.fn(),
    };
    const audio = createConversationStateAudio({
      source: 'turn-received.wav',
      gain: 0.42,
      createPlayer: () => player,
    });

    await audio.playTurnReceived();
    audio.stop();
    audio.unload();

    expect(player.pause).toHaveBeenCalledTimes(1);
    expect(player.remove).toHaveBeenCalledTimes(1);
  });
});
