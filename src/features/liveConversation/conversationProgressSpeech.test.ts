import { createConversationProgressSpeech } from './conversationProgressSpeech';

function harness() {
  let listener: ((status: { playing: boolean; didJustFinish: boolean }) => void) | null = null;
  const player = {
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    addListener: jest.fn((_event, nextListener) => {
      listener = nextListener;
      return { remove: jest.fn() };
    }),
  };
  const createPlayer = jest.fn(() => player);
  const speech = createConversationProgressSpeech({
    sourceForCue: (cueId) => `asset:${cueId}`,
    createPlayer,
  });
  return { speech, player, createPlayer, emit: (status: { playing: boolean; didJustFinish: boolean }) => listener?.(status) };
}

describe('conversation progress speech', () => {
  it('starts a qualifying local cue while agent work continues', async () => {
    const test = harness();
    const onStart = jest.fn();
    const completion = test.speech.start('current_lookup_01', onStart);
    expect(test.createPlayer).toHaveBeenCalledWith('asset:current_lookup_01', {
      downloadFirst: false,
      keepAudioSessionActive: true,
      updateInterval: 100,
    });
    expect(onStart).not.toHaveBeenCalled();
    test.emit({ playing: true, didJustFinish: false });
    expect(onStart).toHaveBeenCalledTimes(1);
    test.emit({ playing: false, didJustFinish: true });
    await completion;
  });

  it('cancels a cue that has not started when the final answer is ready', async () => {
    const test = harness();
    void test.speech.start('general_work_01');
    await test.speech.finishBeforeFinalAnswer();
    expect(test.player.remove).toHaveBeenCalledTimes(1);
  });

  it('lets an audible cue finish before final speech may start', async () => {
    const test = harness();
    void test.speech.start('multi_source_01');
    test.emit({ playing: true, didJustFinish: false });
    let finalMayStart = false;
    const ready = test.speech.finishBeforeFinalAnswer().then(() => { finalMayStart = true; });
    await Promise.resolve();
    expect(finalMayStart).toBe(false);
    test.emit({ playing: false, didJustFinish: true });
    await ready;
    expect(finalMayStart).toBe(true);
  });

  it('stops an audible cue immediately on barge-in', async () => {
    const test = harness();
    const completion = test.speech.start('thoughtful_reasoning_01');
    test.emit({ playing: true, didJustFinish: false });
    test.speech.stop();
    await completion;
    expect(test.player.pause).toHaveBeenCalledTimes(1);
    expect(test.player.remove).toHaveBeenCalledTimes(1);
  });
});
