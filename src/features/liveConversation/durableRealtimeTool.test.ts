import {
  buildRealtimeToolResultEvents,
  createDurableRealtimeTool,
  isDurableRealtimeStopUtterance,
} from './durableRealtimeTool';

describe('durable Realtime tool', () => {
  it('waits for the provider-final transcript and ignores model-authored transcript text', async () => {
    const run = jest.fn(async () => ({ status: 'complete' as const, message: 'Done.' }));
    const tool = createDurableRealtimeTool({ run, transcriptionWaitMs: 1_000 });

    const execution = tool.execute({
      callId: 'call-1',
      name: 'kwilt.run',
      argumentsJson: JSON.stringify({
        realtimeItemId: 'item-1',
        channelContextVersion: 1,
        transcript: 'Model-authored text must not be trusted.',
      }),
    });
    tool.observeFinalTranscript({ itemId: 'item-1', transcript: 'Add milk to groceries.' });

    await expect(execution).resolves.toEqual({ status: 'complete', message: 'Done.' });
    expect(run).toHaveBeenCalledWith({
      realtimeItemId: 'item-1',
      transcript: 'Add milk to groceries.',
      channelContextVersion: 1,
    });
  });

  it('returns needs_input when matching transcription never finalizes', async () => {
    jest.useFakeTimers();
    const run = jest.fn();
    const tool = createDurableRealtimeTool({ run, transcriptionWaitMs: 250 });

    const execution = tool.execute({
      callId: 'call-2',
      name: 'kwilt.run',
      argumentsJson: JSON.stringify({ realtimeItemId: 'item-2', channelContextVersion: 1 }),
    });
    await jest.advanceTimersByTimeAsync(250);

    await expect(execution).resolves.toEqual({
      status: 'needs_input',
      message: 'I did not receive a finalized transcript. Please say that again.',
    });
    expect(run).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('executes each provider call id at most once', async () => {
    const run = jest.fn(async () => ({ status: 'complete' as const, message: 'Done once.' }));
    const tool = createDurableRealtimeTool({ run, transcriptionWaitMs: 1_000 });
    tool.observeFinalTranscript({ itemId: 'item-3', transcript: 'Plan dinner.' });
    const call = {
      callId: 'call-3', name: 'kwilt.run',
      argumentsJson: JSON.stringify({ realtimeItemId: 'item-3', channelContextVersion: 1 }),
    };

    await expect(Promise.all([tool.execute(call), tool.execute(call)]))
      .resolves.toEqual([
        { status: 'complete', message: 'Done once.' },
        { status: 'complete', message: 'Done once.' },
      ]);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('executes each finalized input item at most once across repeated provider calls', async () => {
    const run = jest.fn(async () => ({ status: 'complete' as const, message: 'Done once.' }));
    const tool = createDurableRealtimeTool({ run });
    tool.observeFinalTranscript({ itemId: 'item-repeat', transcript: 'Add milk.' });

    const first = tool.execute({
      callId: 'call-a', name: 'kwilt.run',
      argumentsJson: JSON.stringify({ realtimeItemId: 'item-repeat', channelContextVersion: 1 }),
    });
    const second = tool.execute({
      callId: 'call-b', name: 'kwilt.run',
      argumentsJson: JSON.stringify({ realtimeItemId: 'item-repeat', channelContextVersion: 1 }),
    });

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed calls without enqueueing a durable run', async () => {
    const run = jest.fn();
    const tool = createDurableRealtimeTool({ run });

    await expect(tool.execute({
      callId: 'call-4', name: 'another.tool', argumentsJson: '{}',
    })).resolves.toMatchObject({ status: 'failed' });
    await expect(tool.execute({
      callId: 'call-5', name: 'kwilt.run', argumentsJson: '{bad json',
    })).resolves.toMatchObject({ status: 'failed' });
    expect(run).not.toHaveBeenCalled();
  });

  it('returns tool output to Realtime before requesting the spoken response', () => {
    expect(buildRealtimeToolResultEvents('call-6', {
      status: 'complete', message: 'Milk is on the list.', runId: 'run-1',
    })).toEqual([
      {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: 'call-6',
          output: JSON.stringify({ status: 'complete', message: 'Milk is on the list.', runId: 'run-1' }),
        },
      },
      { type: 'response.create', response: { tool_choice: 'none' } },
    ]);
  });

  it('recognizes only an explicit spoken stop command', () => {
    expect(isDurableRealtimeStopUtterance('Stop.')).toBe(true);
    expect(isDurableRealtimeStopUtterance('cancel that')).toBe(true);
    expect(isDurableRealtimeStopUtterance('Do not stop the timer')).toBe(false);
  });
});
