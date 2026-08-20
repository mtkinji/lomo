import { fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { renderWithProviders } from '../../test/renderWithProviders';
import { OnboardingPageIndicator } from './OnboardingPageIndicator';

describe('OnboardingPageIndicator', () => {
  it('provides a full accessible target for every page', () => {
    const onSelectPage = jest.fn();
    const screen = renderWithProviders(
      <OnboardingPageIndicator currentIndex={1} count={5} onSelectPage={onSelectPage} />,
    );

    const third = screen.getByLabelText('Go to page 3 of 5');
    expect(third.props.style).toEqual(expect.anything());
    fireEvent.press(third);
    expect(onSelectPage).toHaveBeenCalledWith(2);
    expect(screen.getByLabelText('Go to page 2 of 5').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.getByTestId('capabilityOnboarding.liquidCapsule')).toBeTruthy();
    expect(screen.getByTestId('capabilityOnboarding.liquidTeardrop')).toBeTruthy();
    expect(screen.queryAllByTestId('capabilityOnboarding.liquidTail')).toHaveLength(0);
  });

  it('keeps 44-point targets while tightening the visual dot rhythm', () => {
    const screen = renderWithProviders(
      <OnboardingPageIndicator currentIndex={1} count={5} onSelectPage={jest.fn()} />,
    );

    const firstTarget = StyleSheet.flatten(
      screen.getByTestId('capabilityOnboarding.pageIndicator.1').props.style,
    );
    const secondTarget = StyleSheet.flatten(
      screen.getByTestId('capabilityOnboarding.pageIndicator.2').props.style,
    );

    expect(firstTarget).toMatchObject({ height: 44, left: 0, width: 44 });
    expect(secondTarget.left).toBeLessThan(firstTarget.width);
  });

  it('uses a static selected shape when Reduce Motion is enabled', () => {
    const screen = renderWithProviders(
      <OnboardingPageIndicator
        currentIndex={2}
        count={5}
        onSelectPage={jest.fn()}
        reduceMotion
      />,
    );

    expect(screen.getByTestId('capabilityOnboarding.staticSelection')).toBeTruthy();
    expect(screen.queryByTestId('capabilityOnboarding.liquidCapsule')).toBeNull();
    expect(screen.queryByTestId('capabilityOnboarding.liquidTeardrop')).toBeNull();
  });
});
