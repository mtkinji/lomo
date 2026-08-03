import { act, render, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { createEmptyExploreData } from '../domain/exploreState';
import { ExploreSyncRuntimeHost } from './ExploreSyncRuntimeHost';
import { syncExploreHistory } from './exploreSyncRepository';
import { useExploreStore } from './useExploreStore';

jest.mock('./exploreSyncRepository', () => ({
  syncExploreHistory: jest.fn(async () => undefined),
}));

const USER_ID = '11111111-1111-4111-8111-111111111111';

describe('ExploreSyncRuntimeHost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    useExploreStore.setState({ ...createEmptyExploreData(), lastPointDecision: null });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('syncs after hydration and on foreground return', async () => {
    let appStateListener: ((state: string) => void) | null = null;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener: any) => {
      appStateListener = listener;
      return { remove: jest.fn() } as any;
    });

    render(<ExploreSyncRuntimeHost userId={USER_ID} />);
    await waitFor(() => expect(syncExploreHistory).toHaveBeenCalledWith(USER_ID));

    act(() => appStateListener?.('active'));
    await waitFor(() => expect(syncExploreHistory).toHaveBeenCalledTimes(2));
  });

  it('debounces meaningful completed-history changes but ignores active GPS samples', async () => {
    render(<ExploreSyncRuntimeHost userId={USER_ID} />);
    await waitFor(() => expect(syncExploreHistory).toHaveBeenCalledTimes(1));

    act(() => {
      useExploreStore.getState().startSession('2026-08-03T12:00:00.000Z', 'active-session');
      useExploreStore.getState().appendSample({
        latitude: 40.5, longitude: -105.1, altitudeM: null, horizontalAccuracyM: 5,
        altitudeAccuracyM: null, speedMps: 2, courseDeg: 90, recordedAt: '2026-08-03T12:01:00.000Z',
      });
      jest.advanceTimersByTime(2_000);
    });
    expect(syncExploreHistory).toHaveBeenCalledTimes(1);

    act(() => {
      useExploreStore.getState().stopSession('2026-08-03T12:02:00.000Z');
      jest.advanceTimersByTime(2_000);
    });
    await waitFor(() => expect(syncExploreHistory).toHaveBeenCalledTimes(2));
  });
});
