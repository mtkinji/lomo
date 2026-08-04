import { act, fireEvent, render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import * as ReactNative from 'react-native';
import { Dialog } from './Dialog';
import { Text } from './Typography';

describe('Dialog accessibility contract', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('isolates modal content and supports the accessibility escape gesture', () => {
    const onClose = jest.fn();
    const { getByTestId, getByRole } = render(
      <Dialog visible title="Delete goal?" onClose={onClose}>
        <Text>This cannot be undone.</Text>
      </Dialog>,
    );

    expect(getByRole('header')).toHaveTextContent('Delete goal?');
    expect(getByTestId('dialog.surface').props).toMatchObject({
      accessibilityViewIsModal: true,
      importantForAccessibility: 'yes',
    });
    expect(getByTestId('dialog.backdrop', { includeHiddenElements: true }).props.accessible).toBe(false);

    fireEvent(getByTestId('dialog.surface'), 'accessibilityEscape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('moves accessibility focus to the title when opened', () => {
    jest.useFakeTimers();
    const focus = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation();
    jest.spyOn(ReactNative, 'findNodeHandle').mockReturnValue(42);

    render(<Dialog visible title="Choose a date" onClose={jest.fn()} />);
    act(() => jest.runOnlyPendingTimers());

    expect(focus).toHaveBeenCalledTimes(1);
  });
});
