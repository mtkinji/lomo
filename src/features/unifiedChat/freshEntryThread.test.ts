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
});
