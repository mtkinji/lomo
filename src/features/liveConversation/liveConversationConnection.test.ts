import { waitForLiveConversationDataChannel } from './liveConversationConnection';

type TestChannel = {
  onopen: (() => void) | null;
  onerror: (() => void) | null;
};

function createChannel(): TestChannel {
  return { onopen: null, onerror: null };
}

describe('live conversation connection readiness', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not report a connection before the realtime data channel opens', async () => {
    const channel = createChannel();
    let settled = false;
    const readiness = waitForLiveConversationDataChannel(channel, 1_000)
      .then(() => { settled = true; });

    await Promise.resolve();
    expect(settled).toBe(false);

    channel.onopen?.();
    await readiness;
    expect(settled).toBe(true);
  });

  it('rejects an interrupted connection instead of leaving it reconnecting forever', async () => {
    const channel = createChannel();
    const readiness = waitForLiveConversationDataChannel(channel, 1_000);

    channel.onerror?.();

    await expect(readiness).rejects.toThrow('Conversation connection interrupted.');
  });

  it('bounds a connection that never opens', async () => {
    jest.useFakeTimers();
    const channel = createChannel();
    const readiness = waitForLiveConversationDataChannel(channel, 10_000);

    jest.advanceTimersByTime(10_000);

    await expect(readiness).rejects.toThrow('Conversation connection timed out.');
  });
});
