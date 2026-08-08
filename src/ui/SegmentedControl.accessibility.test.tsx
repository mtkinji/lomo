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
  it('associates a FormField label and state with each option', () => {
    const { getByRole } = render(
      <SegmentedControl
        accessibilityLabel="Layout"
        accessibilityHint="Choose how this view is arranged."
        accessibilityState={{ disabled: true }}
        value="list"
        onChange={jest.fn()}
        options={[
          { value: 'list', label: 'List' },
          { value: 'kanban', label: 'Kanban' },
        ]}
      />,
    );

    expect(getByRole('tab', { name: 'Layout, List' }).props).toMatchObject({
      accessibilityHint: 'Choose how this view is arranged.',
      accessibilityState: { disabled: true, selected: true },
    });
  });

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
