import { act, fireEvent, render } from '@testing-library/react-native';
import { AccessibilityInfo, View } from 'react-native';
import * as ReactNative from 'react-native';
import { Dialog } from './Dialog';
import { PortalHost } from './Portal';
import { Text } from './Typography';

function renderDialog(node: React.ReactElement) {
  return render(
    <>
      {node}
      <PortalHost />
    </>,
  );
}

describe('Dialog accessibility contract', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('isolates modal content and supports the accessibility escape gesture', () => {
    const onClose = jest.fn();
    const { getByTestId, getByRole } = renderDialog(
      <Dialog visible title="Delete goal?" onClose={onClose}>
        <Text>This cannot be undone.</Text>
      </Dialog>,
    );

    expect(getByRole('heading')).toHaveTextContent('Delete goal?');
    expect(getByTestId('dialog.surface').props).toMatchObject({
      role: 'dialog',
      accessibilityViewIsModal: true,
      importantForAccessibility: 'yes',
    });
    expect(getByTestId('dialog.backdrop', { includeHiddenElements: true }).props.accessible).toBe(false);

    fireEvent(getByTestId('dialog.surface'), 'accessibilityEscape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('provides consistent title, description, body, footer, and close anatomy', () => {
    const onClose = jest.fn();
    const { getByLabelText, getByTestId, getByText } = renderDialog(
      <Dialog
        visible
        title="Edit view"
        description="Choose how this view behaves."
        onClose={onClose}
        footer={<Text>Save</Text>}
      >
        <Text>View name</Text>
      </Dialog>,
    );

    expect(getByText('Choose how this view behaves.')).toBeTruthy();
    expect(getByTestId('dialog.body')).toHaveTextContent('View name');
    expect(getByTestId('dialog.footer')).toHaveTextContent('Save');
    fireEvent.press(getByLabelText('Close dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('can require an explicit action instead of dismissing from the backdrop', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderDialog(
      <Dialog visible title="Confirm deletion" onClose={onClose} dismissOnBackdrop={false} />,
    );

    fireEvent.press(getByTestId('dialog.backdrop', { includeHiddenElements: true }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('moves accessibility focus to the title when opened', () => {
    jest.useFakeTimers();
    const focus = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation();
    jest.spyOn(ReactNative, 'findNodeHandle').mockReturnValue(42);

    renderDialog(<Dialog visible title="Choose a date" onClose={jest.fn()} />);
    act(() => jest.runOnlyPendingTimers());

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('restores accessibility focus to the supplied opener when closed', () => {
    jest.useFakeTimers();
    const focus = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation();
    const openerRef = { current: {} as View };
    jest.spyOn(ReactNative, 'findNodeHandle').mockImplementation((node) =>
      node === openerRef.current ? 7 : 42,
    );

    const { rerender } = renderDialog(
      <Dialog visible title="Choose a date" onClose={jest.fn()} returnFocusRef={openerRef} />,
    );
    act(() => jest.runOnlyPendingTimers());
    rerender(
      <>
        <Dialog visible={false} title="Choose a date" onClose={jest.fn()} returnFocusRef={openerRef} />
        <PortalHost />
      </>,
    );
    act(() => jest.runOnlyPendingTimers());

    expect(focus).toHaveBeenLastCalledWith(7);
  });
});
