import { fireEvent, render } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { SegmentedControl } from './SegmentedControl';

jest.mock('./hooks/useAccessibilityPreferences', () => ({
  useAccessibilityPreferences: () => ({
    reduceMotionEnabled: true,
    screenReaderEnabled: false,
  }),
}));

describe('SegmentedControl accessibility contract', () => {
  it('exposes selected tabs and moves the thumb without animation when Reduce Motion is on', () => {
    const springSpy = jest.spyOn(Animated, 'spring');
    const { getByRole } = render(
      <SegmentedControl
        value="today"
        onChange={jest.fn()}
        options={[
          { value: 'today', label: 'Today' },
          { value: 'week', label: 'Week' },
        ]}
      />,
    );

    fireEvent(getByRole('tab', { name: 'Today' }), 'layout', {
      nativeEvent: { layout: { x: 4, width: 80 } },
    });

    expect(getByRole('tab', { name: 'Today', selected: true })).toBeTruthy();
    expect(springSpy).not.toHaveBeenCalled();
  });
});
