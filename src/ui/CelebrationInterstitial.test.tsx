import { act, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CelebrationInterstitialHost } from './CelebrationInterstitial';
import { useCelebrationStore } from '../store/useCelebrationStore';
import { useAppStore } from '../store/useAppStore';
import { useHouseholdModeStore } from '../features/household/sharedDevice/useHouseholdModeStore';
jest.mock('@rn-primitives/portal', () => ({
  Portal: require('react-native').View,
}));
jest.mock('./CelebrationGif', () => ({ CelebrationGif: () => null }));
const share = jest.fn();
beforeEach(() => {
  jest.useFakeTimers();
  useHouseholdModeStore.setState({ session: null });
  share.mockClear();
  useAppStore.setState({
    authIdentity: { userId: 'a' },
    userProfile: {
      id: 'a',
      createdAt: '2026-09-09T00:00:00Z',
      updatedAt: '2026-09-09T00:00:00Z',
      communication: {},
      visuals: {},
      preferences: {
        ...useAppStore.getState().userProfile?.preferences,
        showCelebrationMedia: false,
      },
    },
  });
  useCelebrationStore.setState({
    activeCelebration: {
      id: 'moment',
      kind: 'goalCompleted',
      headline: 'You completed a goal!',
      priority: 'high',
      ownerUserId: 'a',
      primaryAction: { label: 'Share this moment', run: share },
    },
    queue: [],
    deferred: [],
  });
});
afterEach(() => {
  useHouseholdModeStore.setState({ session: null });
  useCelebrationStore.setState({ activeCelebration: null });
  jest.useRealTimers();
});
it('hides a personal offer in Household mode', () => {
  useHouseholdModeStore.setState({
    session: {} as NonNullable<
      ReturnType<typeof useHouseholdModeStore.getState>['session']
    >,
  });
  const view = show();
  expect(view.queryByText('You completed a goal!')).toBeNull();
  expect(useCelebrationStore.getState().activeCelebration).toBeNull();
});
function show() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, bottom: 34, left: 0, right: 0 },
      }}
    >
      <CelebrationInterstitialHost />
    </SafeAreaProvider>,
  );
}
it('offers sharing even with celebration media off and Continue does not share', () => {
  const view = show();
  expect(view.getByText('Share this moment')).toBeTruthy();
  fireEvent.press(view.getByText('Continue'));
  act(() => jest.advanceTimersByTime(500));
  expect(share).not.toHaveBeenCalled();
  expect(useCelebrationStore.getState().activeCelebration).toBeNull();
});
it('opens the composer only after the share action and exit animation', () => {
  const view = show();
  fireEvent.press(view.getByText('Share this moment'));
  act(() => jest.advanceTimersByTime(500));
  expect(share).toHaveBeenCalledTimes(1);
});
it('removes an old account offer without exposing its content', () => {
  useAppStore.setState({ authIdentity: { userId: 'b' } });
  const view = show();
  expect(view.queryByText('You completed a goal!')).toBeNull();
  expect(share).not.toHaveBeenCalled();
});
it('clears every queued offer belonging to the previous account', () => {
  const active = useCelebrationStore.getState().activeCelebration!;
  useCelebrationStore.setState({ queue: [{ ...active, id: 'second-moment' }] });
  useAppStore.setState({ authIdentity: { userId: 'b' } });
  show();
  expect(useCelebrationStore.getState().activeCelebration).toBeNull();
});
