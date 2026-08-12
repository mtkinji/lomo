import { renderWithProviders } from '../../test/renderWithProviders';
import { Modal } from 'react-native';
import { StandaloneFocusExperience } from './StandaloneFocusExperience';
import type { StandaloneFocusController } from './useStandaloneFocusController';

jest.mock('./FocusEnvironmentBackdrop', () => ({ FocusEnvironmentBackdrop: () => null }));
jest.mock('./useActiveFocusOrientation', () => ({ useActiveFocusOrientation: jest.fn() }));

describe('StandaloneFocusExperience accessibility contract', () => {
  it('allows the active Focus modal to rotate into either landscape orientation', () => {
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

    expect(UNSAFE_getByType(Modal).props.supportedOrientations).toEqual([
      'portrait',
      'landscape',
    ]);
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
