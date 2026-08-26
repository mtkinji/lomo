import { runDurableRealtimeRequest } from './runDurableRealtimeRequest';

describe('runDurableRealtimeRequest', () => {
  it('returns the terminal durable run message for Realtime speech', async () => {
    const send = jest.fn(async () => undefined);
    const onLoaded = jest.fn();
    await expect(runDurableRealtimeRequest({
      request: { realtimeItemId: 'item-1', transcript: 'Add milk.', channelContextVersion: 1 },
      activeRun: null,
      send,
      getThreadId: () => 'thread-1',
      loadThread: async () => ({
        runs: [{ id: 'run-1', status: 'complete', triggerId: 'voice:item-1', assistantMessageId: 'message-1', errorMessage: null }],
        messages: [{ id: 'message-1', body: 'Milk is on the list.' }],
      }),
      stopRun: jest.fn(),
      onLoaded,
    })).resolves.toEqual({ status: 'complete', message: 'Milk is on the list.', runId: 'run-1' });
    expect(send).toHaveBeenCalledWith(expect.stringContaining('voice:item-1'));
    expect(onLoaded).toHaveBeenCalledTimes(1);
  });

  it('routes an explicit stop through the active durable run contract', async () => {
    const stopRun = jest.fn(async () => undefined);
    const send = jest.fn();
    await expect(runDurableRealtimeRequest({
      request: { realtimeItemId: 'item-2', transcript: 'Stop.', channelContextVersion: 1 },
      activeRun: { runId: 'run-active', owner: 'server' },
      send,
      getThreadId: () => 'thread-1',
      loadThread: jest.fn(),
      stopRun,
      onLoaded: jest.fn(),
    })).resolves.toEqual({ status: 'stopped', message: 'Stopped.', runId: 'run-active' });
    expect(stopRun).toHaveBeenCalledWith('run-active');
    expect(send).not.toHaveBeenCalled();
  });
});
