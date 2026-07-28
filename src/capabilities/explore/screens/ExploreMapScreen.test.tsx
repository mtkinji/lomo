import { act, fireEvent, render } from '@testing-library/react-native';
import { ExploreMapScreen } from './ExploreMapScreen';
import { useExploreStore } from '../runtime/useExploreStore';

const mockOpenMenu = jest.fn();
const mockStart = jest.fn();
const mockStop = jest.fn();
const mockAnimateToRegion = jest.fn();
const mockRecorder = {
  active: false,
  status: 'idle' as const,
  message: null as string | null,
  start: mockStart,
  stop: mockStop,
  setRecordingMode: jest.fn(),
};

jest.mock('../../../navigation/CapabilityShellContext', () => ({
  useCapabilityShell: () => ({ openMenu: mockOpenMenu }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 20, left: 0 }),
}));

jest.mock('../runtime/useExploreRecorder', () => ({
  useExploreRecorder: () => mockRecorder,
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const component = (name: string) => ({ children, ...props }: any) =>
    React.createElement(View, { ...props, testID: props.testID ?? `mock.${name}` }, children);
  const Map = React.forwardRef(({ children, ...props }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ animateToRegion: mockAnimateToRegion }));
    return React.createElement(View, { ...props, testID: props.testID ?? 'mock.map' }, children);
  });
  return {
    __esModule: true,
    default: Map,
    Polygon: component('polygon'),
    Polyline: component('polyline'),
    Marker: component('marker'),
  };
});

jest.mock('../../../ui/BottomDrawer', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BottomDrawer: ({ visible, children }: any) => visible ? React.createElement(View, null, children) : null,
    BottomDrawerScrollView: ({ children, ...props }: any) => React.createElement(View, props, children),
  };
});

describe('ExploreMapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useExploreStore.getState().clearHistory();
      useExploreStore.getState().updatePreferences({
        sharing: 'private',
        showMyPath: true,
        showFamilyTerritory: false,
        recording: 'manual',
        recapNotifications: true,
      });
    });
  });

  it('renders the private empty state and starts only from an explicit action', () => {
    const screen = render(<ExploreMapScreen />);

    expect(screen.getByTestId('page.header')).toBeTruthy();
    expect(screen.getByTestId('nav.drawer.toggle')).toBeTruthy();
    expect(screen.getByText('The world is still waiting.')).toBeTruthy();
    expect(screen.getByText('Your map stays private. Start exploring to clear a 100-foot path through the fog.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Start exploring'));
    expect(mockStart).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByLabelText('Open navigation menu'));
    expect(mockOpenMenu).toHaveBeenCalledTimes(1);
  });

  it('renders unexplored territory as layered fog instead of one uniform scrim', () => {
    const screen = render(<ExploreMapScreen />);

    expect(screen.getByTestId('explore.fog.veil').props.accessible).toBe(false);
    expect(screen.getByTestId('explore.fog.mist').props.accessible).toBe(false);
    expect(screen.getByTestId('explore.fog.core').props.accessible).toBe(false);
  });

  it('keeps sharing and viewing separate and states the family-sync boundary', () => {
    const screen = render(<ExploreMapScreen />);
    fireEvent.press(screen.getByLabelText('Explore layers and privacy'));

    expect(screen.getByLabelText('My path').props.value).toBe(true);
    expect(screen.getByLabelText('Family territory').props.value).toBe(false);
    fireEvent.press(screen.getByLabelText('Share Territory'));
    expect(useExploreStore.getState().preferences.sharing).toBe('territory');
    expect(screen.getByText('Your choice is saved locally. Family delivery is not enabled yet.')).toBeTruthy();
  });

  it('can load a persisted preview walk for visual proof', () => {
    const screen = render(<ExploreMapScreen />);
    fireEvent.press(screen.getByLabelText('Explore layers and privacy'));
    fireEvent.press(screen.getByText('Load preview walk'));

    expect(useExploreStore.getState().sessions).toHaveLength(1);
    expect(Object.keys(useExploreStore.getState().exploredCells).length).toBeGreaterThan(1);
    expect(screen.queryByText('The world is still waiting.')).toBeNull();
    expect(mockAnimateToRegion).toHaveBeenCalledWith(
      expect.objectContaining({ latitudeDelta: 0.018, longitudeDelta: 0.018 }),
      450,
    );
    expect(screen.getByText('You uncovered 3 new Places.')).toBeTruthy();
    expect(screen.getAllByText('Spring Canyon Park').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Foothills Trail').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Harmony Overlook').length).toBeGreaterThan(0);
    fireEvent.press(screen.getByText('Done'));
    expect(useExploreStore.getState().sessions[0].recapStatus).toBe('seen');
  });

  it('offers Always Exploring or manual outings without coupling either to sharing', () => {
    const screen = render(<ExploreMapScreen />);
    fireEvent.press(screen.getByLabelText('Explore layers and privacy'));

    fireEvent.press(screen.getByLabelText('Always Exploring'));
    fireEvent(screen.getByLabelText('One recap notification'), 'valueChange', false);
    expect(mockRecorder.setRecordingMode).toHaveBeenCalledWith('automatic');
    expect(useExploreStore.getState().preferences.sharing).toBe('private');
    expect(useExploreStore.getState().preferences.recapNotifications).toBe(false);
  });

  it('makes pausing ambient recording the main map action', () => {
    act(() => useExploreStore.getState().updatePreferences({ recording: 'automatic' }));
    const screen = render(<ExploreMapScreen />);

    expect(screen.getByText('Pause Exploring')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Pause always exploring'));
    expect(mockRecorder.setRecordingMode).toHaveBeenCalledWith('manual');
  });
});
