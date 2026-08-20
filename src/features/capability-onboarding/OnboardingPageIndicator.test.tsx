import { fireEvent } from '@testing-library/react-native';

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
    expect(screen.getAllByTestId('capabilityOnboarding.liquidBlob')).toHaveLength(5);
    expect(screen.getAllByTestId('capabilityOnboarding.liquidBridge')).toHaveLength(4);
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
    expect(screen.queryAllByTestId('capabilityOnboarding.liquidBridge')).toHaveLength(0);
  });
});
