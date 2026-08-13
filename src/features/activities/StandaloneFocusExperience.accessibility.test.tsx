import { renderWithProviders } from '../../test/renderWithProviders';
import { Modal } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { StandaloneFocusExperience } from './StandaloneFocusExperience';
import type { StandaloneFocusController } from './useStandaloneFocusController';
import { FocusSessionOverlay } from './FocusSessionOverlay';

jest.mock('./FocusEnvironmentBackdrop', () => ({ FocusEnvironmentBackdrop: () => null }));
jest.mock('react-native-screens', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    FullWindowOverlay: ({ children }: { children?: React.ReactNode }) => React.createElement(View, null, children),
  };
});

describe('StandaloneFocusExperience accessibility contract', () => {
  it('uses the iOS window overlay so the active Focus session follows native rotation', () => {
    const controller = {
      session: { mode: 'running' },
      remainingMs: 10 * 60 * 1000,
      end: jest.fn().mockResolvedValue(undefined),
      pauseOrResume: jest.fn().mockResolvedValue(undefined),
    } as unknown as StandaloneFocusController;

    const { UNSAFE_getByType } = renderWithProviders(
      <StandaloneFocusExperience
        controller={controller}
        topInset={0}
        bottomInset={0}
      />,
    );

    expect(UNSAFE_getByType(FocusSessionOverlay)).toBeTruthy();
    expect(UNSAFE_getByType(FullWindowOverlay)).toBeTruthy();
    expect(() => UNSAFE_getByType(Modal)).toThrow();
  });

  it('keeps the timer inside the viewport at accessibility text sizes', () => {
    const controller = {
      session: { mode: 'running' },
      remainingMs: 10 * 60 * 1000,
      end: jest.fn().mockResolvedValue(undefined),
      pauseOrResume: jest.fn().mockResolvedValue(undefined),
    } as unknown as StandaloneFocusController;

    const { getByText } = renderWithProviders(
      <StandaloneFocusExperience
        controller={controller}
        topInset={0}
        bottomInset={0}
      />,
    );

    expect(getByText('10:00').props).toMatchObject({
      adjustsFontSizeToFit: true,
      maxFontSizeMultiplier: 1.4,
      numberOfLines: 1,
    });
  });
});
