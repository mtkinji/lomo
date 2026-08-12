import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo, View } from 'react-native';
import * as ReactNative from 'react-native';
import { AlertDialog } from './AlertDialog';
import { PortalHost } from './Portal';

function renderAlertDialog(node: React.ReactElement) {
  return render(
    <>
      {node}
      <PortalHost />
    </>,
  );
}

describe('AlertDialog', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('requires an explicit safe cancel or consequential action', () => {
    const onClose = jest.fn();
    const onCancel = jest.fn();
    const onAction = jest.fn();
    const { getByLabelText, getByTestId, getByText } = renderAlertDialog(
      <AlertDialog
        visible
        title="Delete this view?"
        description="The view will be removed. Your to-dos will remain."
        cancelLabel="Keep view"
        actionLabel="Delete view"
        onClose={onClose}
        onCancel={onCancel}
        onAction={onAction}
      />,
    );

    expect(getByTestId('alert-dialog.surface').props.role).toBe('alertdialog');
    expect(getByText('The view will be removed. Your to-dos will remain.')).toBeTruthy();

    expect(getByTestId('alert-dialog.backdrop', { includeHiddenElements: true }).props.onPress).toBeUndefined();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.press(getByLabelText('Keep view'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.press(getByLabelText('Delete view'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('announces the title as a heading', () => {
    const { getByRole } = renderAlertDialog(
      <AlertDialog
        visible
        title="Leave without saving?"
        cancelLabel="Continue editing"
        actionLabel="Leave"
        onClose={jest.fn()}
        onAction={jest.fn()}
      />,
    );

    expect(getByRole('heading')).toHaveTextContent('Leave without saving?');
  });

  it('restores accessibility focus to the supplied opener after cancellation', () => {
    jest.useFakeTimers();
    const focus = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation();
    const openerRef = { current: {} as View };
    jest.spyOn(ReactNative, 'findNodeHandle').mockReturnValue(19);

    const props = {
      title: 'Delete this view?',
      cancelLabel: 'Keep view',
      actionLabel: 'Delete view',
      onClose: jest.fn(),
      onAction: jest.fn(),
      returnFocusRef: openerRef,
    };
    const { rerender } = renderAlertDialog(<AlertDialog visible {...props} />);
    rerender(
      <>
        <AlertDialog visible={false} {...props} />
        <PortalHost />
      </>,
    );
    act(() => jest.runOnlyPendingTimers());

    expect(ReactNative.findNodeHandle).toHaveBeenCalledWith(openerRef.current);
    expect(focus).toHaveBeenLastCalledWith(19);
  });
});
