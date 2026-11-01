import { createMoneyCategorySettingsCommand, type CategorySettingsJournal } from './moneyCategorySettingsCommand';
import type { CategorySettingsReceipt, CategorySettingsRequest } from '../domain/categorySettingsCommand';

const request: CategorySettingsRequest = {
  schemaVersion: 1, requestId: '10000000-0000-4000-8000-000000000001',
  actorUserId: '10000000-0000-4000-8000-000000000002', categoryId: '10000000-0000-4000-8000-000000000003',
  expectedCategoryUpdatedAt: '2026-11-01T10:00:00Z', expectedPlanUpdatedAt: '2026-11-01T10:00:00Z',
  settings: { name: 'Household', budgetCents: 50000, fundingRhythm: 'monthly', rolloverEnabled: false,
    rolloverPolicy: null, planRole: 'flexible', expectedNeedCents: null, expectedNeedDueMonth: null }, governance: null,
};
const receipt: CategorySettingsReceipt = {
  requestId: request.requestId, categoryId: request.categoryId, confirmedAt: '2026-11-01T10:01:00Z',
  categoryUpdatedAt: '2026-11-01T10:01:00Z', planUpdatedAt: '2026-11-01T10:01:00Z', activeVersionId: null,
  changes: request.settings,
};
function setup(initial: CategorySettingsRequest | null = null) {
  let stored = initial;
  const journal: CategorySettingsJournal = {
    load: jest.fn(async () => stored),
    save: jest.fn(async (next) => { stored = next; }),
    remove: jest.fn(async () => { stored = null; }),
  };
  const remote = {
    send: jest.fn().mockResolvedValue({ outcome: 'confirmed', receipt }),
    findReceipt: jest.fn().mockResolvedValue(null),
  };
  return { journal, remote, command: createMoneyCategorySettingsCommand(journal, remote), stored: () => stored };
}

describe('durable category settings command', () => {
  it('persists the exact request before sending and does not wait for a snapshot to confirm', async () => {
    const { journal, remote, command, stored } = setup();
    remote.send.mockImplementation(async () => {
      expect(stored()).toEqual(request);
      return { outcome: 'confirmed', receipt };
    });
    await expect(command.execute(request)).resolves.toEqual({ outcome: 'confirmed', receipt });
    expect(journal.save).toHaveBeenCalledWith(request);
    expect(stored()).toBeNull();
  });

  it('sends nothing if the request cannot be saved to the device', async () => {
    const { journal, remote, command } = setup();
    jest.mocked(journal.save).mockRejectedValue(new Error('Storage unavailable'));
    await expect(command.execute(request)).rejects.toThrow('Storage unavailable');
    expect(remote.send).not.toHaveBeenCalled();
  });

  it('recovers a committed write after losing its response without writing again', async () => {
    const { remote, command } = setup();
    remote.send.mockResolvedValue({ outcome: 'unknown', message: 'Connection lost' });
    remote.findReceipt.mockResolvedValue(receipt);
    await expect(command.execute(request)).resolves.toEqual({ outcome: 'confirmed', receipt });
    expect(remote.send).toHaveBeenCalledTimes(1);
  });

  it('keeps uncertain requests and reuses them after recreating the controller', async () => {
    const { journal, remote, command, stored } = setup();
    remote.send.mockResolvedValue({ outcome: 'unknown', message: 'Connection lost' });
    await expect(command.execute(request)).resolves.toMatchObject({ outcome: 'unknown' });
    expect(stored()).toEqual(request);
    const reopened = createMoneyCategorySettingsCommand(journal, remote);
    remote.findReceipt.mockResolvedValue(receipt);
    await expect(reopened.execute(request)).resolves.toEqual({ outcome: 'confirmed', receipt });
    expect(remote.send).toHaveBeenCalledTimes(1);
  });

  it('retries the identical persisted body when no receipt is visible yet', async () => {
    const { remote, command } = setup(request);
    await expect(command.execute(request)).resolves.toMatchObject({ outcome: 'confirmed' });
    expect(remote.send).toHaveBeenCalledWith(request);
    expect(remote.findReceipt).toHaveBeenCalledWith(request);
  });

  it('does not replace an unresolved save with a different request or edited body', async () => {
    const { command, remote, stored } = setup(request);
    await expect(command.execute({ ...request, settings: { ...request.settings, name: 'Different' } })).rejects.toThrow('Resolve the previous save');
    expect(remote.send).not.toHaveBeenCalled();
    expect(stored()).toEqual(request);
  });

  it('shares a simultaneous identical submission and blocks a competing edit', async () => {
    const { command, remote } = setup();
    let complete!: (value: { outcome: 'confirmed'; receipt: CategorySettingsReceipt }) => void;
    remote.send.mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    const first = command.execute(request);
    const same = command.execute(request);
    await expect(command.execute({ ...request, requestId: '10000000-0000-4000-8000-000000000004' })).rejects.toThrow('Resolve the previous save');
    await Promise.resolve(); await Promise.resolve();
    complete({ outcome: 'confirmed', receipt });
    expect(await first).toEqual(await same);
    expect(remote.send).toHaveBeenCalledTimes(1);
  });

  it('does not turn confirmation into failure when local cleanup fails', async () => {
    const { journal, command } = setup();
    jest.mocked(journal.remove).mockRejectedValue(new Error('Storage unavailable'));
    await expect(command.execute(request)).resolves.toEqual({ outcome: 'confirmed', receipt });
  });

  it('retains the original request if receipt recovery is also offline', async () => {
    const { remote, command, stored } = setup();
    remote.send.mockRejectedValue(new Error('Network failed'));
    remote.findReceipt.mockRejectedValue(new Error('Network still failed'));
    await expect(command.execute(request)).resolves.toMatchObject({ outcome: 'unknown' });
    expect(stored()).toEqual(request);
  });

  it('retains an uncertain original save when a later retry is unavailable', async () => {
    const { remote, command, stored } = setup(request);
    remote.findReceipt.mockRejectedValue(new Error('Receipt service unavailable'));
    remote.send.mockResolvedValue({ outcome: 'rejected', message: 'Your changes have not been saved.' });
    await expect(command.execute(request)).resolves.toMatchObject({ outcome: 'unknown' });
    expect(stored()).toEqual(request);
  });

  it('releases a pending request when the locked server command proves it never committed', async () => {
    const { remote, command, stored } = setup(request);
    remote.send.mockResolvedValue({ outcome: 'rejected', message: 'Stale category', resolvesPending: true });
    await expect(command.execute(request)).resolves.toMatchObject({ outcome: 'rejected' });
    expect(stored()).toBeNull();
  });

  it('clears an explicitly rejected request so a corrected draft can be prepared', async () => {
    const { remote, command, stored } = setup();
    remote.send.mockResolvedValue({ outcome: 'rejected', message: 'The category changed.' });
    await expect(command.execute(request)).resolves.toMatchObject({ outcome: 'rejected' });
    expect(stored()).toBeNull();
  });
});
