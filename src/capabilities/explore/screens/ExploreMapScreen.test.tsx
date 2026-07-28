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
      });
    });
  });

  it('renders the private empty state and starts only from an explicit action', () => {
    const screen = render(<ExploreMapScreen />);

    expect(screen.getByText('The world is still waiting.')).toBeTruthy();
    expect(screen.getByText('Private until you start')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Start exploring'));
    expect(mockStart).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByLabelText('Open navigation menu'));
    expect(mockOpenMenu).toHaveBeenCalledTimes(1);
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
  });
});
