import { createFreshEntryThreadGate } from './freshEntryThread';

describe('createFreshEntryThreadGate', () => {
  test('shares one durable thread creation across concurrent first-send preparation', async () => {
    const aggregate = { thread: { id: 'thread-1' } };
    const create = jest.fn().mockResolvedValue({ id: 'thread-1' });
    const load = jest.fn().mockResolvedValue(aggregate);
    const gate = createFreshEntryThreadGate({ create, load });

    const [first, second] = await Promise.all([gate.ensure(), gate.ensure()]);

    expect(create).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledTimes(1);
    expect(first).toBe(aggregate);
    expect(second).toBe(first);
  });

  test('prepares launch context once before exposing the first-send aggregate', async () => {
    const loaded = { thread: { id: 'thread-context' }, context: [] as string[] };
    const prepared = { ...loaded, context: ['todos'] };
    const create = jest.fn().mockResolvedValue({ id: 'thread-context' });
    const load = jest.fn().mockResolvedValue(loaded);
    const prepare = jest.fn().mockResolvedValue(prepared);
    const gate = createFreshEntryThreadGate({ create, load, prepare });

    const [first, second] = await Promise.all([gate.ensure(), gate.ensure()]);

    expect(prepare).toHaveBeenCalledTimes(1);
    expect(prepare).toHaveBeenCalledWith(loaded);
    expect(first).toBe(prepared);
    expect(second).toBe(prepared);
  });

  test('clears a failed creation so an explicit retry can create once', async () => {
    const create = jest.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ id: 'thread-2' });
    const load = jest.fn().mockImplementation(async (thread) => ({ thread }));
    const gate = createFreshEntryThreadGate({ create, load });

    await expect(gate.ensure()).rejects.toThrow('offline');
    await expect(gate.ensure()).resolves.toMatchObject({ thread: { id: 'thread-2' } });
    expect(create).toHaveBeenCalledTimes(2);
  });

  test('cleans up a created thread when launch-context preparation fails', async () => {
    const thread = { id: 'thread-orphan' };
    const cleanup = jest.fn().mockResolvedValue(undefined);
    const gate = createFreshEntryThreadGate({
      create: jest.fn().mockResolvedValue(thread),
      load: jest.fn().mockResolvedValue({ thread }),
      prepare: jest.fn().mockRejectedValue(new Error('context unavailable')),
      cleanup,
    });

    await expect(gate.ensure()).rejects.toThrow('context unavailable');
    expect(cleanup).toHaveBeenCalledWith(thread);
  });
});
