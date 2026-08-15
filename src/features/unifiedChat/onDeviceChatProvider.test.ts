import { generateOnDeviceChatResponse } from './onDeviceChatProvider';

const request = {
  task: 'rewrite' as const,
  prompt: 'Rewrite this: Cannot make it.',
};

describe('generateOnDeviceChatResponse', () => {
  test('returns unavailable without a linked native module', async () => {
    await expect(generateOnDeviceChatResponse(request, null)).resolves.toEqual({
      status: 'unavailable',
      reason: 'module_unavailable',
    });
  });

  test('returns a trimmed successful native response', async () => {
    const nativeModule = {
      availability: jest.fn(async () => ({ state: 'available' as const })),
      generateText: jest.fn(async () => ({ text: '  I’m sorry, but I can’t make it.  ', durationMs: 321 })),
      cancelGeneration: jest.fn(),
    };

    await expect(generateOnDeviceChatResponse(request, nativeModule)).resolves.toEqual({
      status: 'completed',
      text: 'I’m sorry, but I can’t make it.',
      durationMs: 321,
    });
    expect(nativeModule.generateText).toHaveBeenCalledWith(expect.objectContaining({
      prompt: request.prompt,
      requestId: expect.any(String),
      maximumResponseTokens: 96,
      instructions: expect.stringContaining('Return only the rewritten text'),
    }));
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
    }, nativeModule)).resolves.toEqual({
      status: 'completed',
      text: 'Planning the School Week',
      durationMs: 180,
    });
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
    await Promise.resolve();
    await Promise.resolve();
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
    controller.abort();
    releaseAvailability({ state: 'available' });

    await expect(pending).resolves.toEqual({ status: 'cancelled', reason: 'cancelled' });
    expect(nativeModule.generateText).not.toHaveBeenCalled();
  });
});
