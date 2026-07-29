import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ExploreMapScreen } from './ExploreMapScreen';
import { useExploreStore } from '../runtime/useExploreStore';

const mockOpenMenu = jest.fn();
const mockNavigate = jest.fn();
const mockStart = jest.fn();
const mockStop = jest.fn();
const mockBeginOnboarding = jest.fn();
const mockLocate = jest.fn(async () => ({ latitude: 40.55, longitude: -105.12 }));
const mockAnimateToRegion = jest.fn();
const mockRecorder = {
  active: false,
  status: 'idle' as const,
  message: null as string | null,
  beginOnboarding: mockBeginOnboarding,
  start: mockStart,
  stop: mockStop,
  locate: mockLocate,
  setRecordingMode: jest.fn(async () => true),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ getParent: () => ({ navigate: mockNavigate }) }),
}));

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

jest.mock('../../../ui/DropdownMenu', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');
  const MenuContext = React.createContext({ open: false, setOpen: (_open: boolean) => undefined });
  const DropdownMenu = ({ children }: any) => {
    const [open, setOpen] = React.useState(false);
    return React.createElement(MenuContext.Provider, { value: { open, setOpen } }, children);
  };
  const DropdownMenuTrigger = ({ children }: any) => {
    const { setOpen } = React.useContext(MenuContext);
    return React.cloneElement(children, { onPress: () => setOpen(true) });
  };
  const DropdownMenuContent = ({ children }: any) => {
    const { open } = React.useContext(MenuContext);
    return open ? React.createElement(View, null, children) : null;
  };
  const item = ({ children, onPress, accessibilityLabel, accessibilityState, closeOnPress = true }: any) => {
    const { setOpen } = React.useContext(MenuContext);
    return React.createElement(Pressable, {
      onPress: () => {
        onPress?.();
        if (closeOnPress) setOpen(false);
      },
      accessibilityLabel,
      accessibilityState,
    }, children);
  };
  return {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem: item,
    DropdownMenuLabel: ({ children }: any) => React.createElement(Text, null, children),
    DropdownMenuRadioGroup: ({ children }: any) => React.createElement(View, null, children),
    DropdownMenuRadioItem: item,
    DropdownMenuSeparator: () => React.createElement(View),
  };
});

jest.mock('../../../ui/KwiltSwitch', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    KwiltSwitch: ({ value }: any) => React.createElement(View, {
      accessibilityRole: 'switch',
      accessibilityState: { checked: value },
      testID: 'mock.kwiltSwitch',
    }),
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
        showFog: true,
        showPlaces: true,
        mapStyle: 'hybrid',
        recording: 'manual',
        recapNotifications: true,
        onboardingCompleted: true,
        firstPlaceGuideDismissed: true,
      });
    });
  });

  it('welcomes a new explorer with the approved personal-history proposition', () => {
    act(() => useExploreStore.getState().updatePreferences({ onboardingCompleted: false }));
    const screen = render(<ExploreMapScreen />);

    const introduction = screen.getByTestId('explore.onboarding.introduction');
    expect(within(introduction).getByText("See where you’ve been. Explore where you haven’t.")).toBeTruthy();
    expect(within(introduction).getByText('Build a private history of the places and paths you travel.')).toBeTruthy();
    expect(within(introduction).getByLabelText('Begin exploring')).toBeTruthy();
    expect(screen.queryByLabelText('Open navigation menu')).toBeNull();
    expect(screen.queryByLabelText('Explore options')).toBeNull();
    expect(screen.queryByLabelText('Search visited Places')).toBeNull();
    fireEvent.press(within(introduction).getByLabelText('Begin exploring'));
    expect(mockBeginOnboarding).toHaveBeenCalledTimes(1);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('turns the stationary first clearing into an explicit recording-mode choice', async () => {
    act(() => {
      useExploreStore.getState().updatePreferences({
        onboardingCompleted: false,
        firstPlaceGuideDismissed: false,
      });
      useExploreStore.getState().startSession('2026-07-28T12:00:00.000Z', 'first-clearing');
      useExploreStore.getState().appendSample({
        latitude: 40.55,
        longitude: -105.12,
        altitudeM: 1500,
        horizontalAccuracyM: 8,
        altitudeAccuracyM: 6,
        recordedAt: '2026-07-28T12:00:00.000Z',
      }, 'first-point');
    });
    const screen = render(<ExploreMapScreen />);

    expect(screen.getByText('How should Explore remember your travels?')).toBeTruthy();
    expect(screen.queryByText('This is where your Explore history begins')).toBeNull();
    expect(screen.queryByText('Remember the places you go')).toBeNull();
    expect(screen.queryByText(/adds your walks, drives, errands/i)).toBeNull();
    expect(screen.getByLabelText('Explore automatically')).toBeTruthy();
    expect(screen.getByLabelText('Only when I start')).toBeTruthy();
    expect(screen.getByText('Private until you choose to share.')).toBeTruthy();
    expect(screen.queryByLabelText('Open navigation menu')).toBeNull();
    expect(screen.queryByLabelText('Search visited Places')).toBeNull();
    expect(mockAnimateToRegion).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: expect.any(Number), latitudeDelta: 0.0045 }),
      450,
    );
    expect(mockAnimateToRegion.mock.calls[0][0].latitude).toBeLessThan(40.55);

    fireEvent.press(screen.getByLabelText('Only when I start'));
    await waitFor(() => expect(useExploreStore.getState().preferences.onboardingCompleted).toBe(true));
    expect(mockRecorder.setRecordingMode).toHaveBeenCalledWith('manual');
    expect(screen.getByLabelText('Open navigation menu')).toBeTruthy();
    expect(screen.getByLabelText('Explore options')).toBeTruthy();
    expect(screen.getByLabelText('Search visited Places')).toBeTruthy();
    expect(screen.getByText('Start with this Place')).toBeTruthy();
    expect(screen.getByText(/Give this clearing a name/)).toBeTruthy();
    expect(screen.getByText(/show or hide map layers/)).toBeTruthy();
    fireEvent.press(screen.getByText('Not now'));
    expect(useExploreStore.getState().preferences.firstPlaceGuideDismissed).toBe(true);
    expect(screen.queryByText('Start with this Place')).toBeNull();
  });

  it('renders the private empty state and starts only from an explicit action', () => {
    const screen = render(<ExploreMapScreen />);

    expect(screen.queryByTestId('page.header')).toBeNull();
    expect(screen.getByLabelText('Open navigation menu')).toBeTruthy();
    expect(screen.getByTestId('nav.drawer.icon.line.top', { includeHiddenElements: true }).props.d)
      .toBe('M4 8h16');
    expect(screen.getByTestId('nav.drawer.icon.line.bottom', { includeHiddenElements: true }).props.d)
      .toBe('M4 16h12');
    expect(screen.getByLabelText('Explore options')).toBeTruthy();
    expect(screen.getAllByTestId('explore.actions.icon').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Center on current location')).toBeTruthy();
    expect(screen.getByLabelText('Search visited Places')).toBeTruthy();
    expect(screen.getByText('The world is still waiting.')).toBeTruthy();
    expect(screen.getByText('Your map stays private. Start exploring to clear a path through the fog.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Start exploring'));
    expect(mockStart).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByLabelText('Open navigation menu'));
    expect(mockOpenMenu).toHaveBeenCalledTimes(1);
  });

  it('uses Silver Mist over Apple Maps with the approved clear core and feather scale', () => {
    const screen = render(<ExploreMapScreen />);

    const map = screen.getByTestId('explore.map', { includeHiddenElements: true });
    expect(map.props.mapType).toBe('hybrid');
    expect(map.props.fogEnabled).toBe(true);
    expect(map.props.fogClearRadiusMeters).toBeCloseTo(65 * 0.3048, 3);
    expect(map.props.fogFeatherReferenceRadiusMeters).toBeCloseTo(100 * 0.3048, 3);
    expect(map.props.fogCoordinates).toEqual([]);
    expect(map.props.accessibilityElementsHidden).toBe(true);
    expect(map.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(screen.queryByTestId('explore.fog.veil', { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByTestId('explore.fog.mist', { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByTestId('explore.fog.core', { includeHiddenElements: true })).toBeNull();
  });

  it('places the primary action above a composer-sized bottom utility row', () => {
    const screen = render(<ExploreMapScreen />);

    expect(StyleSheet.flatten(screen.getByTestId('explore.actionDock').props.style)).toMatchObject({
      left: 32,
      right: 32,
      paddingBottom: 20,
    });
    expect(StyleSheet.flatten(screen.getByTestId('explore.mapToolsRow').props.style)).toMatchObject({
      height: 48,
    });
    expect(StyleSheet.flatten(screen.getByLabelText('Search visited Places').props.style)).toMatchObject({
      height: 48,
    });
    expect(StyleSheet.flatten(screen.getByTestId('explore.hereControls').props.style)).toMatchObject({
      width: 48,
      height: 96,
    });

    const renderedOrder = JSON.stringify(screen.toJSON());
    const primaryIndex = renderedOrder.indexOf('explore.recording.toggle');
    const utilityIndex = renderedOrder.indexOf('explore.mapToolsRow');
    expect(primaryIndex).toBeGreaterThanOrEqual(0);
    expect(utilityIndex).toBeGreaterThan(primaryIndex);
  });

  it('names the current clearing from the persistent Here control', () => {
    act(() => {
      useExploreStore.getState().startSession('2026-07-28T12:00:00.000Z', 'first-clearing');
      useExploreStore.getState().appendSample({
        latitude: 40.55,
        longitude: -105.12,
        altitudeM: 1500,
        horizontalAccuracyM: 8,
        altitudeAccuracyM: 6,
        recordedAt: '2026-07-28T12:00:00.000Z',
      }, 'first-point');
    });
    const screen = render(<ExploreMapScreen />);

    expect(screen.getByLabelText('Name current Place')).toBeTruthy();
    expect(screen.getByLabelText('Center on current location')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Name current Place'));
    expect(screen.getByText('Name this Place')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Place name'), 'Home');
    fireEvent.press(screen.getByText('Save Place'));

    expect(Object.values(useExploreStore.getState().places)).toEqual([
      expect.objectContaining({ name: 'Home', source: 'user' }),
    ]);
    expect(screen.queryByText('Name this Place')).toBeNull();
    expect(screen.getAllByTestId('mock.marker', { includeHiddenElements: true })).toHaveLength(1);

    fireEvent.press(screen.getByLabelText('Search visited Places'));
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.queryByText('Collect current Place')).toBeNull();
  });

  it('hides collected markers without removing Places from search', () => {
    act(() => useExploreStore.getState().loadPreviewAdventure());
    const screen = render(<ExploreMapScreen />);
    fireEvent.press(screen.getByText('Done'));
    expect(screen.getAllByTestId('mock.marker', { includeHiddenElements: true }).length).toBeGreaterThan(0);

    fireEvent.press(screen.getByLabelText('Explore options'));
    fireEvent.press(screen.getByLabelText('Places'));

    expect(useExploreStore.getState().preferences.showPlaces).toBe(false);
    expect(screen.queryAllByTestId('mock.marker', { includeHiddenElements: true })).toHaveLength(0);
    fireEvent.press(screen.getByLabelText('Search visited Places'));
    expect(screen.getByText('Spring Canyon Park')).toBeTruthy();
  });

  it('does not render a collected Place marker outside explored territory', () => {
    act(() => {
      useExploreStore.getState().addPlaceVisit({
        place: {
          id: 'apple:hidden-place',
          name: 'Hidden Place',
          kind: 'place',
          latitude: 40.7,
          longitude: -105.2,
          source: 'apple-maps',
        },
        userId: 'local-user',
      });
    });

    const screen = render(<ExploreMapScreen />);

    expect(screen.queryByText('Hidden Place')).toBeNull();
    expect(screen.queryAllByTestId('mock.marker')).toHaveLength(0);
  });

  it('keeps the map menu contextual and routes durable controls to Explore settings', () => {
    const screen = render(<ExploreMapScreen />);
    fireEvent.press(screen.getByLabelText('Explore options'));

    expect(screen.getByText('Map style')).toBeTruthy();
    expect(screen.getByText('Satellite')).toBeTruthy();
    expect(screen.getByText('Hybrid')).toBeTruthy();
    expect(screen.getByText('Standard')).toBeTruthy();
    expect(screen.getByLabelText('Fog')).toBeTruthy();
    expect(screen.getByLabelText('Places')).toBeTruthy();
    expect(screen.getByLabelText('My path')).toBeTruthy();
    expect(screen.getByLabelText('Family territory')).toBeTruthy();
    expect(screen.getAllByTestId('mock.kwiltSwitch')).toHaveLength(4);
    fireEvent.press(screen.getByTestId('explore.mapStyle.standard'));
    expect(useExploreStore.getState().preferences.mapStyle).toBe('standard');
    fireEvent.press(screen.getByLabelText('Explore settings'));
    expect(mockNavigate).toHaveBeenCalledWith('Settings', {
      screen: 'SettingsExplore',
      params: { entrySurface: 'explore-map' },
    });
  });

  it('can load a persisted preview walk for visual proof', () => {
    act(() => useExploreStore.getState().loadPreviewAdventure());
    const screen = render(<ExploreMapScreen />);

    expect(useExploreStore.getState().sessions).toHaveLength(1);
    expect(Object.keys(useExploreStore.getState().exploredCells).length).toBeGreaterThan(1);
    expect(screen.queryByText('The world is still waiting.')).toBeNull();
    expect(mockAnimateToRegion).toHaveBeenCalledWith(
      expect.objectContaining({ latitudeDelta: 0.0045, longitudeDelta: 0.0045 }),
      450,
    );
    expect(screen.getByText('You uncovered 3 new Places.')).toBeTruthy();
    expect(screen.getAllByText('Spring Canyon Park').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Foothills Trail').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Harmony Overlook').length).toBeGreaterThan(0);
    fireEvent.press(screen.getByText('Done'));
    expect(useExploreStore.getState().sessions[0].recapStatus).toBe('seen');
  });

  it('never draws a path segment between separate outings', () => {
    act(() => {
      const store = useExploreStore.getState();
      store.startSession('2026-07-28T12:00:00.000Z', 'completed-outing');
      store.appendSample({
        latitude: 40.55,
        longitude: -105.12,
        altitudeM: 1500,
        horizontalAccuracyM: 8,
        altitudeAccuracyM: 6,
        recordedAt: '2026-07-28T12:00:00.000Z',
      }, 'completed-point-1');
      store.appendSample({
        latitude: 40.5503,
        longitude: -105.1203,
        altitudeM: 1510,
        horizontalAccuracyM: 8,
        altitudeAccuracyM: 6,
        recordedAt: '2026-07-28T12:01:00.000Z',
      }, 'completed-point-2');
      store.stopSession('2026-07-28T12:02:00.000Z');
      store.startSession('2026-07-28T13:00:00.000Z', 'active-outing');
      store.appendSample({
        latitude: 40.56,
        longitude: -105.13,
        altitudeM: 1520,
        horizontalAccuracyM: 8,
        altitudeAccuracyM: 6,
        recordedAt: '2026-07-28T13:00:00.000Z',
      }, 'active-point-1');
      store.appendSample({
        latitude: 40.5603,
        longitude: -105.1303,
        altitudeM: 1530,
        horizontalAccuracyM: 8,
        altitudeAccuracyM: 6,
        recordedAt: '2026-07-28T13:01:00.000Z',
      }, 'active-point-2');
    });

    const screen = render(<ExploreMapScreen />);

    expect(screen.getAllByTestId('mock.polyline', { includeHiddenElements: true })).toHaveLength(2);
  });

  it('recenters on a fresh foreground location without starting an outing', async () => {
    const screen = render(<ExploreMapScreen />);

    fireEvent.press(screen.getByLabelText('Center on current location'));

    await waitFor(() => expect(mockLocate).toHaveBeenCalledTimes(1));
    expect(mockStart).not.toHaveBeenCalled();
    expect(mockAnimateToRegion).toHaveBeenCalledWith({
      latitude: 40.55,
      longitude: -105.12,
      latitudeDelta: 0.0045,
      longitudeDelta: 0.0045,
    }, 450);
  });

  it('searches only visited Places and centers the selected result', () => {
    act(() => useExploreStore.getState().loadPreviewAdventure());
    const screen = render(<ExploreMapScreen />);
    fireEvent.press(screen.getByText('Done'));

    fireEvent.press(screen.getByLabelText('Search visited Places'));
    fireEvent.changeText(screen.getByLabelText('Search Places'), 'Harmony');

    expect(screen.queryByText('Foothills Trail')).toBeNull();
    fireEvent.press(screen.getByText('Harmony Overlook'));
    expect(mockAnimateToRegion).toHaveBeenLastCalledWith(
      expect.objectContaining({ latitudeDelta: 0.0045, longitudeDelta: 0.0045 }),
      450,
    );
  });

  it('can turn fog off from the contextual map menu', () => {
    const screen = render(<ExploreMapScreen />);
    fireEvent.press(screen.getByLabelText('Explore options'));

    fireEvent.press(screen.getByLabelText('Fog'));
    expect(useExploreStore.getState().preferences.showFog).toBe(false);
    expect(screen.getByTestId('explore.map', { includeHiddenElements: true }).props.fogEnabled).toBe(false);
  });

  it('keeps the contextual menu open while changing multiple map layers', () => {
    const screen = render(<ExploreMapScreen />);
    fireEvent.press(screen.getByLabelText('Explore options'));

    fireEvent.press(screen.getByLabelText('Fog'));
    expect(useExploreStore.getState().preferences.showFog).toBe(false);
    fireEvent.press(screen.getByLabelText('Family territory'));
    expect(useExploreStore.getState().preferences.showFamilyTerritory).toBe(true);
    expect(screen.getByLabelText('My path')).toBeTruthy();
  });

  it('keeps automatic exploring quiet instead of showing a persistent pause action', () => {
    act(() => useExploreStore.getState().updatePreferences({ recording: 'automatic' }));
    const screen = render(<ExploreMapScreen />);

    expect(screen.queryByText('Pause Exploring')).toBeNull();
    expect(screen.queryByLabelText('Pause always exploring')).toBeNull();
    expect(screen.getByLabelText('Search visited Places')).toBeTruthy();
  });
});
