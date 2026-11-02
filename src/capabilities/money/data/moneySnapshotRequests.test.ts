import { createMoneySnapshotRequests } from './moneySnapshotRequests';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe('Money snapshot requests', () => {
  it('shares a pending read only within the same mutation generation', async () => {
    const before = deferred<string>();
    const after = deferred<string>();
    const load = jest.fn().mockReturnValueOnce(before.promise).mockReturnValueOnce(after.promise);
    const requests = createMoneySnapshotRequests(load);
    const first = requests.read(0);
    expect(requests.read(0)).toBe(first);
    const second = requests.read(1);
    expect(second).not.toBe(first);
    expect(load).toHaveBeenCalledTimes(2);
    before.resolve('old');
    await first;
    expect(requests.read(1)).toBe(second);
    expect(load).toHaveBeenCalledTimes(2);
    after.resolve('new');
    expect(await second).toBe('new');
  });

  it('loads fresh data after a completed read', async () => {
    const load = jest.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');
    const requests = createMoneySnapshotRequests(load);
    expect(await requests.read(0)).toBe('first');
    expect(await requests.read(0)).toBe('second');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('allows retry after rejection without leaving a rejected promise cached', async () => {
    const load = jest.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce('recovered');
    const requests = createMoneySnapshotRequests(load);
    await expect(requests.read(0)).rejects.toThrow('Offline');
    expect(await requests.read(0)).toBe('recovered');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not let an obsolete rejection clear a newer pending read', async () => {
    const before = deferred<string>();
    const after = deferred<string>();
    const load = jest.fn().mockReturnValueOnce(before.promise).mockReturnValueOnce(after.promise);
    const requests = createMoneySnapshotRequests(load);
    const first = requests.read(0);
    const second = requests.read(1);
    before.reject(new Error('Old failure'));
    await expect(first).rejects.toThrow('Old failure');
    expect(requests.read(1)).toBe(second);
    expect(load).toHaveBeenCalledTimes(2);
    after.resolve('new');
    await second;
  });
});
