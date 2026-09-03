import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { ExploreMapScreen } from './ExploreMapScreen';
import { useExploreStore } from '../runtime/useExploreStore';
import { useAppStore } from '../../../store/useAppStore';
import { reconstructExploreRecordedPath } from '../runtime/explorePathReconstruction';
import * as exploreGeometry from '../domain/exploreGeometry';
import { useCapabilityDiscoveryStore } from '../../../store/useCapabilityDiscoveryStore';
import type { ExploreData } from '../domain/types';

const mockOpenMenu = jest.fn();
const mockNavigate = jest.fn();
const mockStart = jest.fn();
const mockStop = jest.fn();
const mockBeginOnboarding = jest.fn();
const mockLocate = jest.fn(async () => ({ latitude: 40.55, longitude: -105.12 }));
const mockAnimateToRegion = jest.fn();
const mockFitToCoordinates = jest.fn();
const mockNearbySearch = jest.fn(async () => undefined);
const mockNearbySetRadius = jest.fn();
type MockBottomGuideProps = {
  children?: ReactNode;
  visible: boolean;
  scrim?: 'none' | 'light';
  dynamicSizing?: boolean;
};
const mockBottomGuideProps: MockBottomGuideProps[] = [];
let mockNearbyStatus: 'idle' | 'loading' | 'ready' | 'empty' | 'unavailable' | 'error' = 'ready';
let mockNearbyRadius: 'quarter-mile' | 'half-mile' | 'one-mile' = 'half-mile';
let mockNearbyResults = [{
  id: 'nearby-nezu',
  name: 'Nezu Shrine',
  category: 'MKPOICategoryLandmark',
  kind: 'landmark' as const,
  latitude: 35.7201,
  longitude: 139.7608,
  distanceM: 420,
  reason: 'A landmark near you',
}];
let mockNearbySearchedCenter: { latitude: number; longitude: number } | null = null;
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

jest.mock('../runtime/useExploreRecapResolver', () => ({
  useExploreRecapResolver: () => undefined,
}));

jest.mock('../runtime/explorePathReconstruction', () => ({
  reconstructExploreRecordedPath: jest.fn(async () => []),
}));

jest.mock('../runtime/useExploreNearbyPlaces', () => ({
  useExploreNearbyPlaces: () => ({
    status: mockNearbyStatus,
    radius: mockNearbyRadius,
    results: mockNearbyResults,
    searchedCenter: mockNearbySearchedCenter,
    setRadius: mockNearbySetRadius,
    search: mockNearbySearch,
  }),
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const component = (name: string) => ({ children, ...props }: any) =>
    React.createElement(View, { ...props, testID: props.testID ?? `mock.${name}` }, children);
  const Map = React.forwardRef(({ children, ...props }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: mockAnimateToRegion,
      fitToCoordinates: mockFitToCoordinates,
    }));
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

jest.mock('../../../ui/BottomGuide', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BottomGuide: ({ children, ...props }: MockBottomGuideProps) => {
      mockBottomGuideProps.push(props);
      return props.visible ? React.createElement(View, { testID: 'mock.bottomGuide' }, children) : null;
    },
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
    mockBottomGuideProps.length = 0;
    mockNearbyStatus = 'ready';
    mockNearbyRadius = 'half-mile';
    mockNearbyResults = [{
      id: 'nearby-nezu', name: 'Nezu Shrine', category: 'MKPOICategoryLandmark', kind: 'landmark',
      latitude: 35.7201, longitude: 139.7608, distanceM: 420, reason: 'A landmark near you',
    }];
    mockNearbySearchedCenter = null;
    useCapabilityDiscoveryStore.setState({
      discovery: {
        initialized: true,
        eligible: false,
        menuOpened: false,
        visitedCapabilityIds: [],
      },
    });
    act(() => {
      useAppStore.getState().clearAuthIdentity();
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
    expect(within(introduction).getByLabelText('Record a path')).toBeTruthy();
    expect(screen.queryByLabelText('Open navigation menu')).toBeNull();
    expect(screen.queryByLabelText('Explore options')).toBeNull();
    expect(screen.queryByLabelText('Open Places')).toBeNull();
    fireEvent.press(within(introduction).getByLabelText('Record a path'));
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
    expect(screen.queryByLabelText('Open Places')).toBeNull();
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
    expect(screen.getByLabelText('Open Places')).toBeTruthy();
    expect(screen.getByText('Start with this Place')).toBeTruthy();
    expect(screen.getByText(/Give this clearing a name/)).toBeTruthy();
    expect(screen.getByText(/show or hide map layers/)).toBeTruthy();
    fireEvent.press(screen.getByText('Not now'));
    expect(useExploreStore.getState().preferences.firstPlaceGuideDismissed).toBe(true);
    expect(screen.queryByText('Start with this Place')).toBeNull();
  });

  it('treats restored completed history as past onboarding so its recap cannot trap navigation', () => {
    act(() => {
      const store = useExploreStore.getState();
      store.updatePreferences({ onboardingCompleted: false });
      store.startSession('2026-08-24T12:00:00.000Z', 'restored-session');
      store.appendSample({
        latitude: 40.55,
        longitude: -105.12,
        altitudeM: 1500,
        horizontalAccuracyM: 8,
        altitudeAccuracyM: 6,
        recordedAt: '2026-08-24T12:00:00.000Z',
      }, 'restored-point');
      store.stopSession('2026-08-24T12:20:00.000Z', 'background-stillness');
      store.resolveSessionPlaces('restored-session', [], 'local-user');
    });

    const screen = render(<ExploreMapScreen />);

    expect(screen.queryByText('How should Explore remember your travels?')).toBeNull();
    expect(screen.getByLabelText('Open navigation menu')).toBeTruthy();
    expect(screen.getByText('Path saved to your map.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('explore.recap.done'));
    expect(useExploreStore.getState().sessions[0]?.recapStatus).toBe('seen');
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
    expect(screen.getByLabelText('Open Places')).toBeTruthy();
    expect(screen.getByText('The world is still waiting.')).toBeTruthy();
    expect(screen.getByText('Your map stays private. Record a path to reveal the world around it.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Record a path'));
    expect(mockStart).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByLabelText('Open navigation menu'));
    expect(mockOpenMenu).toHaveBeenCalledTimes(1);
  });

  it('carries the first-install discovery signal into its custom floating menu control', () => {
    useCapabilityDiscoveryStore.setState({
      discovery: {
        initialized: true,
        eligible: true,
        menuOpened: false,
        visitedCapabilityIds: [],
      },
    });

    const screen = render(<ExploreMapScreen />);

    expect(screen.getByTestId('nav.drawer.discovery')).toBeTruthy();
    expect(screen.getByLabelText('Open navigation menu, new destinations available')).toBeTruthy();
  });

  it('uses Silver Mist over Apple Maps with the trusted core and broader atmospheric feather', () => {
    const screen = render(<ExploreMapScreen />);

    const map = screen.getByTestId('explore.map', { includeHiddenElements: true });
    expect(map.props.mapType).toBe('hybrid');
    expect(map.props.fogEnabled).toBe(true);
    expect(map.props.fogClearRadiusMeters).toBeCloseTo(65 * 0.3048, 3);
    expect(map.props.fogFeatherReferenceRadiusMeters).toBeCloseTo(200 * 0.3048, 3);
    expect(map.props.fogCoordinates).toEqual([]);
    expect(map.props.fogSegmentStarts).toEqual([]);
    expect(map.props.fogSegmentEnds).toEqual([]);
    expect(map.props.accessibilityElementsHidden).toBe(true);
    expect(map.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(screen.queryByTestId('explore.fog.veil', { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByTestId('explore.fog.mist', { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByTestId('explore.fog.core', { includeHiddenElements: true })).toBeNull();
  });

  it('does not build Android polygon fog holes on iOS', () => {
    act(() => useExploreStore.getState().loadPreviewAdventure());
    const buildFogHole = jest.spyOn(exploreGeometry, 'buildFogHole');

    render(<ExploreMapScreen />);

    expect(buildFogHole).not.toHaveBeenCalled();
    buildFogHole.mockRestore();
  });

  it('does not scan explored cells for Android polygon fog on iOS', () => {
    let cellReads = 0;
    const exploredCells: ExploreData['exploredCells'] = {};
    Object.defineProperty(exploredCells, 'cell-a', {
      enumerable: true,
      get: () => {
        cellReads += 1;
        return {
          id: 'cell-a',
          center: { latitude: 40.55, longitude: -105.12 },
          firstExploredAt: '2026-08-21T12:00:00.000Z',
          lastExploredAt: '2026-08-21T12:00:00.000Z',
        };
      },
    });
    act(() => {
      useExploreStore.setState({ exploredCells });
    });
    cellReads = 0;

    render(<ExploreMapScreen />);

    expect(cellReads).toBe(1);
  });

  it('continues building and rendering polygon fog holes on Android', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    act(() => useExploreStore.getState().loadPreviewAdventure());
    const buildFogHole = jest.spyOn(exploreGeometry, 'buildFogHole');

    const screen = render(<ExploreMapScreen />);

    expect(buildFogHole).toHaveBeenCalled();
    expect(screen.getByTestId('explore.fog.veil', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('explore.fog.mist', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('explore.fog.core', { includeHiddenElements: true })).toBeTruthy();
    screen.unmount();
    buildFogHole.mockRestore();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
  });

  it('sends recorded movement to Silver Mist without granting a broad reveal from Adventure alone', () => {
    act(() => useExploreStore.getState().loadPreviewAdventure());
    const screen = render(<ExploreMapScreen />);
    const map = screen.getByTestId('explore.map', { includeHiddenElements: true });

    expect(map.props.fogCoordinates).toEqual([]);
    expect(map.props.fogSegmentStarts.length).toBeGreaterThan(0);
    expect(map.props.fogSegmentStarts).toHaveLength(map.props.fogSegmentEnds.length);
    expect(map.props.fogPlaceCoordinates).toEqual([]);
    expect(map.props.fogPlaceRevealRadiusMeters).toBeCloseTo(3 * 65 * 0.3048, 3);
    expect(screen.getAllByTestId('explore.path.casing', { includeHiddenElements: true }).length)
      .toBeLessThan(map.props.fogSegmentStarts.length);
  });

  it('renders ambient movement as isolated fog clearings without granting it path semantics', () => {
    act(() => {
      const store = useExploreStore.getState();
      store.startSession('2026-07-28T12:00:00.000Z', 'ambient-outing', 'ambient');
      store.appendSample({
        latitude: 40.55,
        longitude: -105.12,
        altitudeM: 1500,
        horizontalAccuracyM: 8,
        altitudeAccuracyM: 6,
        recordedAt: '2026-07-28T12:00:00.000Z',
      }, 'ambient-point-1');
      store.appendSample({
        latitude: 40.5507,
        longitude: -105.1207,
        altitudeM: 1510,
        horizontalAccuracyM: 8,
        altitudeAccuracyM: 6,
        recordedAt: '2026-07-28T12:01:00.000Z',
      }, 'ambient-point-2');
    });

    const screen = render(<ExploreMapScreen />);
    const map = screen.getByTestId('explore.map', { includeHiddenElements: true });

    expect(map.props.fogCoordinates).toHaveLength(2);
    expect(map.props.fogSegmentStarts).toEqual([]);
    expect(map.props.fogSegmentEnds).toEqual([]);
    expect(map.props.fogPlaceCoordinates).toEqual([]);
    expect(screen.queryByTestId('explore.path.casing', { includeHiddenElements: true })).toBeNull();
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
    expect(StyleSheet.flatten(screen.getByLabelText('Open Places').props.style)).toMatchObject({
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
    const map = screen.getByTestId('explore.map', { includeHiddenElements: true });
    expect(map.props.fogPlaceCoordinates).toEqual([
      expect.objectContaining({ latitude: 40.55, longitude: -105.12 }),
    ]);
    expect(map.props.fogPlaceRevealRadiusMeters).toBeCloseTo(3 * 65 * 0.3048, 3);
    expect(screen.queryByText('Name this Place')).toBeNull();
    expect(screen.getAllByTestId('mock.marker', { includeHiddenElements: true })).toHaveLength(1);

    fireEvent.press(screen.getByLabelText('Open Places'));
    fireEvent.press(screen.getByTestId('explore.places.segment.my-places'));
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.queryByText('Collect current Place')).toBeNull();
  });

  it('keeps a user-confirmed Place bloom after the local Explore identity becomes signed in', () => {
    act(() => {
      useExploreStore.getState().addPlaceVisit({
        place: {
          id: 'user:home',
          name: 'Home',
          kind: 'place',
          latitude: 40.55,
          longitude: -105.12,
          source: 'user',
        },
        userId: 'local-user',
        visitedAt: '2026-08-02T12:00:00.000Z',
      });
      useAppStore.getState().setAuthIdentity({ userId: 'signed-in-user', email: 'andrew@example.com' });
    });

    const screen = render(<ExploreMapScreen />);
    const map = screen.getByTestId('explore.map', { includeHiddenElements: true });

    expect(map.props.fogPlaceCoordinates).toEqual([
      expect.objectContaining({ id: 'user:home', latitude: 40.55, longitude: -105.12 }),
    ]);
    expect(map.props.fogPlaceRevealRadiusMeters).toBeCloseTo(3 * 65 * 0.3048, 3);
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
    fireEvent.press(screen.getByLabelText('Open Places'));
    fireEvent.press(screen.getByTestId('explore.places.segment.my-places'));
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
    expect(screen.getByText('Path saved to your map.')).toBeTruthy();
    expect(screen.getByText('Spring Canyon Park · Foothills Trail · Harmony Overlook')).toBeTruthy();
    fireEvent.press(screen.getByText('Done'));
    expect(useExploreStore.getState().sessions[0].recapStatus).toBe('seen');
  });

  it('replays one deliberate Adventure through the route and fog from its first point', () => {
    act(() => useExploreStore.getState().loadPreviewAdventure());
    const screen = render(<ExploreMapScreen />);
    const completeMap = screen.getByTestId('explore.map', { includeHiddenElements: true });
    expect(completeMap.props.fogSegmentStarts.length).toBeGreaterThan(0);
    expect(reconstructExploreRecordedPath).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Review'));
    expect(reconstructExploreRecordedPath).toHaveBeenCalledWith(useExploreStore.getState().sessions[0].points);
    fireEvent.press(screen.getByText('Replay'));

    const replayMap = screen.getByTestId('explore.map', { includeHiddenElements: true });
    expect(replayMap.props.fogSegmentStarts).toEqual([]);
    expect(screen.getByTestId('explore.playback.cursor', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Pause')).toBeTruthy();
    expect(mockFitToCoordinates).toHaveBeenCalledWith(
      useExploreStore.getState().sessions[0].points,
      expect.objectContaining({ animated: true }),
    );

    fireEvent(replayMap, 'touchStart');
    expect(screen.getByText('Resume')).toBeTruthy();
  });

  it('uses inclusive recorded-path language for deliberate recording', () => {
    const screen = render(<ExploreMapScreen />);

    expect(screen.getByLabelText('Record a path')).toBeTruthy();
    expect(screen.queryByText('Start Exploring')).toBeNull();
  });

  it('keeps playback controls out of an ambient recap', () => {
    act(() => {
      const store = useExploreStore.getState();
      store.startSession('2026-08-02T12:00:00.000Z', 'ambient-recap', 'ambient');
      store.appendSample({
        latitude: 40.55, longitude: -105.12, altitudeM: 1500,
        horizontalAccuracyM: 8, altitudeAccuracyM: 6, recordedAt: '2026-08-02T12:00:00.000Z',
      }, 'ambient-1');
      store.appendSample({
        latitude: 40.5503, longitude: -105.12, altitudeM: 1510,
        horizontalAccuracyM: 8, altitudeAccuracyM: 6, recordedAt: '2026-08-02T12:00:30.000Z',
      }, 'ambient-2');
      store.stopSession('2026-08-02T12:01:00.000Z', 'background-stillness');
      store.resolveSessionPlaces('ambient-recap', [], 'local-user');
    });
    const screen = render(<ExploreMapScreen />);

    expect(screen.getByText('Explore Recap')).toBeTruthy();
    expect(mockBottomGuideProps.some((props) => props.visible && props.scrim === 'none' && props.dynamicSizing)).toBe(true);
    expect(screen.queryByText('Replay')).toBeNull();
    expect(screen.queryByText('Elevation')).toBeNull();
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

    expect(screen.getAllByTestId('explore.path.casing', { includeHiddenElements: true })).toHaveLength(2);
    expect(screen.getAllByTestId('explore.path.altitude', { includeHiddenElements: true })).toHaveLength(2);
  });

  it('renders elevation as a continuous per-point color gradient', () => {
    act(() => {
      const store = useExploreStore.getState();
      store.startSession('2026-08-02T12:00:00.000Z', 'gradient-outing');
      [1500, 2250, 3000].forEach((altitudeM, index) => store.appendSample({
        latitude: 40.55 + index * 0.0002,
        longitude: -105.12,
        altitudeM,
        horizontalAccuracyM: 8,
        altitudeAccuracyM: 6,
        recordedAt: `2026-08-02T12:00:0${index}.000Z`,
      }, `gradient-point-${index}`));
    });

    const screen = render(<ExploreMapScreen />);
    const gradient = screen.getByTestId('explore.path.altitude', { includeHiddenElements: true });

    expect(gradient.props.coordinates).toHaveLength(2);
    expect(gradient.props.strokeColors).toEqual(['#5F7E54', '#D28A3D']);
    expect(gradient.props.strokeColor).toBeUndefined();
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

    fireEvent.press(screen.getByLabelText('Open Places'));
    fireEvent.press(screen.getByTestId('explore.places.segment.my-places'));
    fireEvent.changeText(screen.getByLabelText('Search Places'), 'Harmony');

    expect(screen.queryByText('Foothills Trail')).toBeNull();
    fireEvent.press(screen.getByText('Harmony Overlook'));
    expect(mockAnimateToRegion).toHaveBeenLastCalledWith(
      expect.objectContaining({ latitudeDelta: 0.0045, longitudeDelta: 0.0045 }),
      450,
    );
  });

  it('opens one Places drawer on Nearby and keeps recommendation pins out of history', () => {
    const screen = render(<ExploreMapScreen />);

    fireEvent.press(screen.getByLabelText('Open Places'));

    expect(mockNearbySearch).toHaveBeenCalledWith(expect.objectContaining({
      latitude: expect.any(Number), longitude: expect.any(Number),
    }));
    expect(screen.getByTestId('explore.places.segment.nearby').props.accessibilityState.selected).toBe(true);
    expect(screen.getByText('Nezu Shrine')).toBeTruthy();
    expect(screen.getByText('A landmark near you')).toBeTruthy();
    expect(screen.getByText('0.3 mi away')).toBeTruthy();
    expect(screen.getByLabelText('Suggestion: Nezu Shrine. A landmark near you. 0.3 mi away. View on map')).toBeTruthy();
    expect(screen.getAllByTestId('explore.nearby.marker', { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.getByTestId('explore.nearby.marker.glyph', { includeHiddenElements: true })).toBeTruthy();
    expect(Object.keys(useExploreStore.getState().places)).toHaveLength(0);
  });

  it('switches the drawer and map pins between Nearby and My Places without changing tracking mode', () => {
    act(() => useExploreStore.getState().loadPreviewAdventure());
    const screen = render(<ExploreMapScreen />);
    fireEvent.press(screen.getByText('Done'));
    fireEvent.press(screen.getByLabelText('Open Places'));

    expect(screen.getAllByTestId('explore.nearby.marker', { includeHiddenElements: true })).toHaveLength(1);
    fireEvent.press(screen.getByTestId('explore.places.segment.my-places'));

    expect(screen.queryAllByTestId('explore.nearby.marker', { includeHiddenElements: true })).toHaveLength(0);
    expect(screen.getByLabelText('Search Places')).toBeTruthy();
    expect(screen.getAllByText('Spring Canyon Park').length).toBeGreaterThan(0);
    expect(useExploreStore.getState().preferences.recording).toBe('manual');
  });

  it('keeps row and pin selection synchronized and supports explicit radius and area refresh', () => {
    mockNearbySearchedCenter = { latitude: 40, longitude: -105 };
    const screen = render(<ExploreMapScreen />);
    fireEvent.press(screen.getByLabelText('Open Places'));

    const marker = screen.getByTestId('explore.nearby.marker', { includeHiddenElements: true });
    fireEvent.press(marker);
    expect(screen.getByLabelText('Suggestion: Nezu Shrine. A landmark near you. 0.3 mi away. View on map').props.accessibilityState.selected).toBe(true);
    expect(mockAnimateToRegion).toHaveBeenLastCalledWith(
      expect.objectContaining({ longitude: 139.7608, latitudeDelta: 0.0045 }),
      450,
    );
    expect(mockAnimateToRegion.mock.calls.at(-1)?.[0].latitude).toBeLessThan(35.7201);

    fireEvent.press(screen.getByTestId('explore.nearby.radius.quarter-mile'));
    expect(mockNearbySetRadius).toHaveBeenCalledWith('quarter-mile');
    expect(mockNearbySearch).toHaveBeenLastCalledWith(expect.any(Object), 'quarter-mile');

    fireEvent.press(screen.getByText('Search this area'));
    expect(mockNearbySearch).toHaveBeenCalledTimes(3);
  });

  it('shows calm loading, empty, unavailable, and error states', () => {
    mockNearbyResults = [];
    mockNearbyStatus = 'loading';
    const loading = render(<ExploreMapScreen />);
    fireEvent.press(loading.getByLabelText('Open Places'));
    expect(loading.getByText('Finding a few places nearby…')).toBeTruthy();
    loading.unmount();

    mockNearbyStatus = 'empty';
    const empty = render(<ExploreMapScreen />);
    fireEvent.press(empty.getByLabelText('Open Places'));
    expect(empty.getByText('No strong suggestions in this area yet.')).toBeTruthy();
    empty.unmount();

    mockNearbyStatus = 'unavailable';
    const unavailable = render(<ExploreMapScreen />);
    fireEvent.press(unavailable.getByLabelText('Open Places'));
    expect(unavailable.getByText('Nearby suggestions are not available on this device yet.')).toBeTruthy();
    unavailable.unmount();

    mockNearbyStatus = 'error';
    const failed = render(<ExploreMapScreen />);
    fireEvent.press(failed.getByLabelText('Open Places'));
    expect(failed.getByText('Nearby places could not load. Try this area again.')).toBeTruthy();
    const searchesBeforeRetry = mockNearbySearch.mock.calls.length;
    fireEvent.press(failed.getByText('Try again'));
    expect(mockNearbySearch).toHaveBeenCalledTimes(searchesBeforeRetry + 1);
  });

  it('can turn fog off from the contextual map menu', () => {
    const screen = render(<ExploreMapScreen />);
    fireEvent.press(screen.getByLabelText('Explore options'));

    fireEvent.press(screen.getByLabelText('Fog'));
    expect(useExploreStore.getState().preferences.showFog).toBe(false);
    const map = screen.getByTestId('explore.map', { includeHiddenElements: true });
    expect(map.props.fogEnabled).toBe(false);
    expect(map.props.fogPlaceCoordinates).toEqual([]);
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
    expect(screen.getByLabelText('Open Places')).toBeTruthy();
  });
});
