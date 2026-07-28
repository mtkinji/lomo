import { act, fireEvent, render } from '@testing-library/react-native';
import { ExploreSettingsScreen } from './ExploreSettingsScreen';
import { useExploreStore } from '../runtime/useExploreStore';

const mockSetRecordingMode = jest.fn(async () => true);
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../runtime/useExploreRecorder', () => ({
  useExploreRecorder: () => ({ setRecordingMode: mockSetRecordingMode }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 20, left: 0 }),
}));

jest.mock('../../../ui/KwiltSwitch', () => ({
  KwiltSwitch: () => null,
}));

describe('ExploreSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useExploreStore.getState().clearHistory();
      useExploreStore.getState().updatePreferences({
        sharing: 'private',
        showMyPath: true,
        showFamilyTerritory: false,
        showFog: true,
        mapStyle: 'hybrid',
        recording: 'manual',
        recapNotifications: true,
        onboardingCompleted: true,
      });
    });
  });

  const renderScreen = () => render(
    <ExploreSettingsScreen
      {...({
        navigation: {
          canGoBack: () => true,
          getParent: () => ({ navigate: mockNavigate }),
          goBack: mockGoBack,
        },
        route: { key: 'explore-settings', name: 'SettingsExplore', params: undefined },
      } as any)}
    />,
  );

  it('owns durable Explore controls on a standard Settings page', () => {
    const screen = renderScreen();

    expect(screen.getByText('Explore')).toBeTruthy();
    expect(screen.getByLabelText('Fog')).toBeTruthy();
    expect(screen.getByLabelText('Always Exploring')).toBeTruthy();
    expect(screen.getByLabelText('One recap notification')).toBeTruthy();
    expect(screen.getByLabelText('Share Private')).toBeTruthy();
    expect(screen.queryByText('Visited Places')).toBeNull();
  });

  it('persists map presentation choices shared with the contextual menu', () => {
    const screen = renderScreen();

    fireEvent.press(screen.getByLabelText('Fog'));
    fireEvent.press(screen.getByLabelText('Satellite'));

    expect(useExploreStore.getState().preferences).toMatchObject({
      showFog: false,
      mapStyle: 'satellite',
    });
  });

  it('delegates tracking changes to the recorder without changing sharing', () => {
    const screen = renderScreen();

    fireEvent.press(screen.getByLabelText('Always Exploring'));

    expect(mockSetRecordingMode).toHaveBeenCalledWith('automatic');
    expect(useExploreStore.getState().preferences.sharing).toBe('private');
  });

  it('returns through the Settings stack', () => {
    const screen = render(
      <ExploreSettingsScreen
        {...({
          navigation: {
            canGoBack: () => true,
            getParent: () => ({ navigate: mockNavigate }),
            goBack: mockGoBack,
          },
          route: { key: 'explore-settings', name: 'SettingsExplore', params: undefined },
        } as any)}
      />,
    );

    fireEvent.press(screen.getByLabelText('Go back from Explore'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('returns directly to Explore when opened from the map', () => {
    const screen = render(
      <ExploreSettingsScreen
        {...({
          navigation: {
            canGoBack: () => true,
            getParent: () => ({ navigate: mockNavigate }),
            goBack: mockGoBack,
          },
          route: {
            key: 'explore-settings',
            name: 'SettingsExplore',
            params: { entrySurface: 'explore-map' },
          },
        } as any)}
      />,
    );

    fireEvent.press(screen.getByLabelText('Go back from Explore'));
    expect(mockNavigate).toHaveBeenCalledWith('Explore', { screen: 'ExploreMap' });
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
