import {
  generateOnDeviceChatResponse,
  prewarmOnDeviceChatModel,
} from './onDeviceChatProvider';

const request = {
  task: 'rewrite' as const,
  prompt: 'Rewrite this: Cannot make it.',
};

async function waitForGenerationStart(generateText: jest.Mock) {
  for (let attempt = 0; attempt < 12 && !generateText.mock.calls.length; attempt += 1) {
    await Promise.resolve();
  }
  expect(generateText).toHaveBeenCalledTimes(1);
}

describe('generateOnDeviceChatResponse', () => {
  test('returns unavailable without a linked native module', async () => {
    await expect(generateOnDeviceChatResponse(request, null)).resolves.toEqual({
      status: 'unavailable',
      reason: 'module_unavailable',
    });
  });

  test('routes a bundled challenger to cloud without probing the device', async () => {
    const nativeModule = {
      availability: jest.fn(async () => ({ state: 'unavailable' as const, reason: 'model_not_ready' as const })),
      generateText: jest.fn(),
      cancelGeneration: jest.fn(),
    };

    await expect(generateOnDeviceChatResponse({
      task: 'shorten',
      prompt: 'Shorten this: I will arrive a little later than planned.',
    }, nativeModule)).resolves.toEqual({
      status: 'unavailable',
      reason: 'job_not_promoted',
    });
    expect(nativeModule.availability).not.toHaveBeenCalled();
  });

  test('returns a trimmed successful native response', async () => {
    const nativeModule = {
      availability: jest.fn(async () => ({ state: 'available' as const })),
      generateText: jest.fn(async () => ({ text: '  I’m sorry, but I can’t make it.  ', durationMs: 321 })),
      cancelGeneration: jest.fn(),
    };

    await expect(generateOnDeviceChatResponse(request, nativeModule)).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      text: 'I’m sorry, but I can’t make it.',
      durationMs: 321,
      firstOutputMs: 321,
      warmState: 'cold',
    }));
    expect(nativeModule.generateText).toHaveBeenCalledWith(expect.objectContaining({
      prompt: request.prompt,
      requestId: expect.any(String),
      maximumResponseTokens: 96,
      instructions: expect.stringContaining('Return only the rewritten text'),
    }));
  });

  test('publishes only matching cumulative snapshots for a strong local task and removes the listener', async () => {
    let listener: ((event: { requestId: string; text: string; durationMs: number }) => void) | undefined;
    const remove = jest.fn();
    const onUpdate = jest.fn();
    const nativeModule = {
      availability: jest.fn(async () => ({ state: 'available' as const })),
      addListener: jest.fn((_eventName: string, nextListener: typeof listener) => {
        listener = nextListener;
        return { remove };
      }),
      generateText: jest.fn(async (options: { requestId: string }) => {
        listener?.({ requestId: 'another-request', text: 'ignore me', durationMs: 100 });
        listener?.({ requestId: options.requestId, text: "I'm hungry.", durationMs: 180 });
        listener?.({ requestId: options.requestId, text: 'I’m sorry,', durationMs: 240 });
        listener?.({ requestId: options.requestId, text: 'I’m sorry, but I cannot attend.', durationMs: 360 });
        return { text: 'I’m sorry, but I cannot attend.', durationMs: 380 };
      }),
      cancelGeneration: jest.fn(),
    };

    await expect(generateOnDeviceChatResponse(
      request,
      nativeModule,
      undefined,
      onUpdate,
    )).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      text: 'I’m sorry, but I cannot attend.',
      durationMs: 380,
      firstOutputMs: 360,
    }));
    expect(nativeModule.addListener).toHaveBeenCalledWith('onGenerationSnapshot', expect.any(Function));
    expect(onUpdate.mock.calls).toEqual([
      ['I’m sorry, but I cannot attend.'],
    ]);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  test('does not publish snapshots for a cohort that needs final-output validation', async () => {
    let listener: ((event: { requestId: string; text: string; durationMs: number }) => void) | undefined;
    const onUpdate = jest.fn();
    const nativeModule = {
      availability: jest.fn(async () => ({ state: 'available' as const })),
      addListener: jest.fn((_eventName: string, nextListener: typeof listener) => {
        listener = nextListener;
        return { remove: jest.fn() };
      }),
      generateText: jest.fn(async (options: { requestId: string }) => {
        listener?.({ requestId: options.requestId, text: 'A partial summary', durationMs: 200 });
        return { text: 'A concise summary.', durationMs: 500 };
      }),
      cancelGeneration: jest.fn(),
    };

    await generateOnDeviceChatResponse({
      task: 'summarize',
      prompt: 'Summarize this: A short source.',
    }, nativeModule, undefined, onUpdate);

    expect(onUpdate).not.toHaveBeenCalled();
  });

  test('fails closed when final output misses the local quality gate', async () => {
    const source = 'The committee reviewed the picnic plan and assigned follow-up work. '.repeat(12);
    const nativeModule = {
      availability: jest.fn(async () => ({ state: 'available' as const })),
      generateText: jest.fn(async () => ({ text: source, durationMs: 900 })),
      cancelGeneration: jest.fn(),
    };

    await expect(generateOnDeviceChatResponse({
      task: 'summarize',
      prompt: `Summarize this update:\n\n${source}`,
    }, nativeModule)).resolves.toEqual(expect.objectContaining({
      status: 'failed',
      reason: 'quality_gate_failed',
      totalMs: 900,
    }));
  });

  test('prewarms an available native model at most once per module', async () => {
    const nativeModule = {
      availability: jest.fn(async () => ({ state: 'available' as const })),
      generateText: jest.fn(),
      cancelGeneration: jest.fn(),
      prewarm: jest.fn(async () => undefined),
    };

    await Promise.all([
      prewarmOnDeviceChatModel(nativeModule),
      prewarmOnDeviceChatModel(nativeModule),
    ]);

    expect(nativeModule.availability).toHaveBeenCalledTimes(1);
    expect(nativeModule.prewarm).toHaveBeenCalledTimes(1);
  });

  test('uses the registered title budget and title-only instructions', async () => {
    const nativeModule = {
      availability: jest.fn(async () => ({ state: 'available' as const })),
      generateText: jest.fn(async () => ({ text: 'Planning the School Week', durationMs: 180 })),
      cancelGeneration: jest.fn(),
    };

    await expect(generateOnDeviceChatResponse({
      task: 'thread_title',
      prompt: 'User: Help plan the school week.',
    }, nativeModule)).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      text: 'Planning the School Week',
      durationMs: 180,
      firstOutputMs: 180,
    }));
    expect(nativeModule.generateText).toHaveBeenCalledWith(expect.objectContaining({
      maximumResponseTokens: 32,
      instructions: expect.stringContaining('3–6 word title'),
    }));
  });

  test('preserves an availability reason for cloud fallback', async () => {
    const nativeModule = {
      availability: jest.fn(async () => ({
        state: 'unavailable' as const,
        reason: 'model_not_ready' as const,
      })),
      generateText: jest.fn(),
      cancelGeneration: jest.fn(),
    };

    await expect(generateOnDeviceChatResponse(request, nativeModule)).resolves.toEqual({
      status: 'unavailable',
      reason: 'model_not_ready',
    });
    expect(nativeModule.generateText).not.toHaveBeenCalled();
  });

  test('turns a native error into a cloud-fallback result', async () => {
    const nativeModule = {
      availability: jest.fn(async () => ({ state: 'available' as const })),
      generateText: jest.fn(async () => { throw new Error('private native detail'); }),
      cancelGeneration: jest.fn(),
    };

    await expect(generateOnDeviceChatResponse(request, nativeModule)).resolves.toEqual({
      status: 'failed',
      reason: 'generation_failed',
    });
  });

  test('turns an availability bridge error into a cloud-fallback result', async () => {
    const nativeModule = {
      availability: jest.fn(async () => { throw new Error('bridge unavailable'); }),
      generateText: jest.fn(),
      cancelGeneration: jest.fn(),
    };

    await expect(generateOnDeviceChatResponse(request, nativeModule)).resolves.toEqual({
      status: 'failed',
      reason: 'availability_failed',
    });
    expect(nativeModule.generateText).not.toHaveBeenCalled();
  });

  test('cancels native generation when the turn signal aborts', async () => {
    const controller = new AbortController();
    let release!: (value: { text: string; durationMs: number }) => void;
    const nativeModule = {
      availability: jest.fn(async () => ({ state: 'available' as const })),
      generateText: jest.fn(() => new Promise<{ text: string; durationMs: number }>((resolve) => { release = resolve; })),
      cancelGeneration: jest.fn(),
    };

    const pending = generateOnDeviceChatResponse(request, nativeModule, controller.signal);
    await waitForGenerationStart(nativeModule.generateText);
    controller.abort();
    release({ text: 'late response', durationMs: 1000 });

    await expect(pending).resolves.toEqual({ status: 'cancelled', reason: 'cancelled' });
    expect(nativeModule.cancelGeneration).toHaveBeenCalledWith(expect.any(String));
  });

  test('does not start generation when the turn aborts during availability', async () => {
    const controller = new AbortController();
    let releaseAvailability!: (value: { state: 'available' }) => void;
    const nativeModule = {
      availability: jest.fn(() => new Promise<{ state: 'available' }>((resolve) => {
        releaseAvailability = resolve;
      })),
      generateText: jest.fn(),
      cancelGeneration: jest.fn(),
    };

    const pending = generateOnDeviceChatResponse(request, nativeModule, controller.signal);
    for (let attempt = 0; attempt < 12 && !nativeModule.availability.mock.calls.length; attempt += 1) {
      await Promise.resolve();
    }
    expect(nativeModule.availability).toHaveBeenCalledTimes(1);
    controller.abort();
    releaseAvailability({ state: 'available' });

    await expect(pending).resolves.toEqual({ status: 'cancelled', reason: 'cancelled' });
    expect(nativeModule.generateText).not.toHaveBeenCalled();
  });

  test('keeps a streaming job local after it misses the first-output target', async () => {
    jest.useFakeTimers();
    let resolveGeneration!: (value: { text: string; durationMs: number }) => void;
    const nativeModule = {
      availability: jest.fn(async () => ({ state: 'available' as const })),
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      generateText: jest.fn(() => new Promise<{ text: string; durationMs: number }>((resolve) => {
        resolveGeneration = resolve;
      })),
      cancelGeneration: jest.fn(),
    };

    const pending = generateOnDeviceChatResponse(request, nativeModule, undefined, jest.fn());
    await waitForGenerationStart(nativeModule.generateText);
    jest.advanceTimersByTime(4_000);
    expect(nativeModule.cancelGeneration).not.toHaveBeenCalled();
    resolveGeneration({ text: 'I cannot make it.', durationMs: 4_000 });

    await expect(pending).resolves.toEqual(expect.objectContaining({ status: 'completed' }));
    jest.useRealTimers();
  });

  test('keeps a final-only job local after it misses the total-duration target', async () => {
    jest.useFakeTimers();
    let resolveGeneration!: (value: { text: string; durationMs: number }) => void;
    const nativeModule = {
      availability: jest.fn(async () => ({ state: 'available' as const })),
      generateText: jest.fn(() => new Promise<{ text: string; durationMs: number }>((resolve) => {
        resolveGeneration = resolve;
      })),
      cancelGeneration: jest.fn(),
    };

    const pending = generateOnDeviceChatResponse({
      task: 'summarize',
      prompt: 'Summarize this: The picnic committee selected Saturday.',
    }, nativeModule);
    await waitForGenerationStart(nativeModule.generateText);
    jest.advanceTimersByTime(8_000);
    expect(nativeModule.cancelGeneration).not.toHaveBeenCalled();
    resolveGeneration({ text: 'The picnic committee selected Saturday.', durationMs: 8_000 });

    await expect(pending).resolves.toEqual(expect.objectContaining({ status: 'completed' }));
    jest.useRealTimers();
  });
});
