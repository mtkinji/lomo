import { Platform, View } from 'react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import type { ActivityFocusController } from './useActivityFocusController';
import { ActivityFocusExperience } from './ActivityFocusExperience';

const mockBottomDrawerProps: Array<{ snapPoints?: readonly string[] }> = [];

jest.mock('../../ui/BottomDrawer', () => ({
  BottomDrawer: ({ children, ...props }: { children?: React.ReactNode; snapPoints?: readonly string[] }) => {
    const React = jest.requireActual('react');
    const { View: MockView } = jest.requireActual('react-native');
    mockBottomDrawerProps.push(props);
    return React.createElement(MockView, null, children);
  },
}));

jest.mock('react-native-screens', () => {
  const React = jest.requireActual('react');
  const { View: MockView } = jest.requireActual('react-native');
  return {
    FullWindowOverlay: ({ children }: { children?: React.ReactNode }) => React.createElement(MockView, null, children),
  };
});

jest.mock('./FocusSetupContent', () => {
  const React = jest.requireActual('react');
  const { View: MockView } = jest.requireActual('react-native');
  return {
    FocusSetupContent: () => React.createElement(MockView, { testID: 'focus-setup-content' }),
  };
});

describe('ActivityFocusExperience drawer presentation', () => {
  beforeEach(() => {
    mockBottomDrawerProps.length = 0;
  });

  it('opens the standard iOS setup drawer tall enough for its complete contents', () => {
    expect(Platform.OS).toBe('ios');

    const controller: ActivityFocusController = {
      session: null,
      minutes: 25,
      maxMinutes: 180,
      presets: [10, 25, 45, 60],
      customOptions: [5, 10, 15, 20, 25, 30],
      customExpanded: false,
      isCustomValue: false,
      remainingMs: 0,
      open: jest.fn(),
      close: jest.fn(),
      setMinutes: jest.fn(),
      setCustomExpanded: jest.fn(),
      start: jest.fn(async () => undefined),
      pauseOrResume: jest.fn(async () => undefined),
      end: jest.fn(async () => undefined),
    };

    renderWithProviders(
      <ActivityFocusExperience
        setupVisible
        activityTitle="Prepare groceries"
        topInset={47}
        bottomInset={34}
        portalHostName="focus-setup-test"
        controller={controller}
        screenTimeOffer={<View />}
        soundscapeEnabled
        soundscapeTrackId="quietRain"
        overlayColorIndex={0}
        setSoundscapeEnabled={jest.fn()}
        setSoundscapeTrackId={jest.fn()}
        setOverlayColorIndex={jest.fn()}
      />,
    );

    expect(mockBottomDrawerProps.at(-1)?.snapPoints).toEqual(['82%']);
  });
});
