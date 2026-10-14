import { referenceCheckedStorage } from './referenceCheckedStorage';

function fixture() {
  const backing = {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async (_name: string, _value: unknown): Promise<void> => undefined),
    removeItem: jest.fn(async () => undefined),
  };
  const storage = referenceCheckedStorage(backing);
  return { storage, backing };
}

it('skips equal immutable snapshots but persists changed fields, versions, and keys', async () => {
  const { storage, backing } = fixture();
  const prefs = { enabled: true };
  await storage.setItem('a', { state: { prefs }, version: 1 });
  await storage.setItem('a', { state: { prefs }, version: 1 });
  expect(backing.setItem).toHaveBeenCalledTimes(1);
  await storage.setItem('a', { state: { prefs: { enabled: false } }, version: 1 });
  await storage.setItem('a', { state: { prefs }, version: 2 });
  await storage.setItem('b', { state: { prefs }, version: 2 });
  expect(backing.setItem).toHaveBeenCalledTimes(4);
});

it('retries a failed write instead of treating it as durable', async () => {
  const { storage, backing } = fixture();
  const value = { state: { enabled: true } };
  backing.setItem.mockRejectedValueOnce(new Error('disk unavailable'));
  await expect(storage.setItem('a', value)).rejects.toThrow('disk unavailable');
  await storage.setItem('a', value);
  expect(backing.setItem).toHaveBeenCalledTimes(2);
});

it('invalidates deduplication after removal or an explicit rehydration read', async () => {
  const { storage, backing } = fixture();
  const value = { state: { enabled: true } };
  await storage.setItem('a', value);
  await storage.removeItem('a');
  await storage.setItem('a', value);
  await storage.getItem('a');
  await storage.setItem('a', value);
  expect(backing.setItem).toHaveBeenCalledTimes(3);
});

it('keeps a newer successful snapshot cached when an older pending write fails', async () => {
  const { storage, backing } = fixture();
  let reject!: (error: Error) => void;
  backing.setItem.mockImplementationOnce(() => new Promise<void>((_resolve, fail) => { reject = fail; }));
  const old = storage.setItem('a', { state: { enabled: false } });
  const failed = expect(old).rejects.toThrow('older write failed');
  const latest = { state: { enabled: true } };
  await storage.setItem('a', latest);
  reject(new Error('older write failed'));
  await failed;
  await storage.setItem('a', latest);
  expect(backing.setItem).toHaveBeenCalledTimes(2);
});
