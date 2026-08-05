import { render, waitFor } from '@testing-library/react-native';
import type { MoneySnapshot } from '../data/moneySnapshot';
import { MoneyWidgetStateRuntimeHost } from './MoneyWidgetStateRuntimeHost';
import { createMoneyRepository } from '../data/moneyRepository';
import { clearMoneyGlanceableState, syncMoneyGlanceableState } from './moneyGlanceableState';
import { moneySnapshotCache } from './moneySnapshotCache';

jest.mock('../data/moneyRepository', () => ({
  createMoneyRepository: jest.fn(),
}));

jest.mock('./moneyGlanceableState', () => ({
  clearMoneyGlanceableState: jest.fn(async () => undefined),
  syncMoneyGlanceableState: jest.fn(async () => undefined),
}));

jest.mock('./moneySnapshotCache', () => ({
  moneySnapshotCache: {
    load: jest.fn(),
    save: jest.fn(async () => undefined),
  },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
}

const cachedSnapshot = { periodLabel: 'August 2026', generatedAt: 'cached' } as MoneySnapshot;
const freshSnapshot = { periodLabel: 'August 2026', generatedAt: 'fresh' } as MoneySnapshot;

describe('MoneyWidgetStateRuntimeHost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes cached categories before the authoritative refresh finishes', async () => {
    const refresh = deferred<MoneySnapshot>();
    (moneySnapshotCache.load as jest.Mock).mockResolvedValue(cachedSnapshot);
    (createMoneyRepository as jest.Mock).mockReturnValue({ loadSnapshot: jest.fn(() => refresh.promise) });

    render(<MoneyWidgetStateRuntimeHost userId="user-a" />);

    await waitFor(() => expect(syncMoneyGlanceableState).toHaveBeenCalledWith(cachedSnapshot));
    expect(clearMoneyGlanceableState).toHaveBeenCalledTimes(1);
    expect(moneySnapshotCache.load).toHaveBeenCalledWith('user-a');

    refresh.resolve(freshSnapshot);
    await waitFor(() => expect(syncMoneyGlanceableState).toHaveBeenLastCalledWith(freshSnapshot));
    expect(moneySnapshotCache.save).toHaveBeenCalledWith('user-a', freshSnapshot);
  });

  it('clears financial widget state when there is no signed-in user', async () => {
    render(<MoneyWidgetStateRuntimeHost userId={null} />);

    await waitFor(() => expect(clearMoneyGlanceableState).toHaveBeenCalledTimes(1));
    expect(moneySnapshotCache.load).not.toHaveBeenCalled();
    expect(createMoneyRepository).not.toHaveBeenCalled();
  });
});
