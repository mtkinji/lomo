import React from 'react';
import { StyleSheet, View } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '../test/renderWithProviders';
import { colors } from '../theme';
import { ActivityListItem } from './ActivityListItem';

describe('ActivityListItem timing metadata', () => {
  it('edits visible timing properties without opening the row', () => {
    const onMetaPress = jest.fn();
    const onEstimatePress = jest.fn();
    const onPress = jest.fn();

    renderWithProviders(
      <ActivityListItem
        title="Call Jenny"
        meta="Past due"
        metaTone="urgent"
        onMetaPress={onMetaPress}
        metaAccessibilityLabel="Edit due date for Call Jenny, currently Past due"
        estimateMeta="~30 min"
        onEstimatePress={onEstimatePress}
        estimateAccessibilityLabel="Edit duration for Call Jenny, currently about 30 minutes"
        onPress={onPress}
      />,
    );

    fireEvent.press(
      screen.getByLabelText('Edit due date for Call Jenny, currently Past due'),
    );

    expect(onMetaPress).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();

    fireEvent.press(
      screen.getByLabelText('Edit duration for Call Jenny, currently about 30 minutes'),
    );

    expect(onEstimatePress).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();

    const row = screen.getByLabelText('Call Jenny');
    expect(row.props.accessibilityActions).toEqual([
      { name: 'editDueDate', label: 'Edit due date' },
      { name: 'editDuration', label: 'Edit duration' },
    ]);

    fireEvent(row, 'accessibilityAction', {
      nativeEvent: { actionName: 'editDueDate' },
    });
    expect(onMetaPress).toHaveBeenCalledTimes(2);

    fireEvent(row, 'accessibilityAction', {
      nativeEvent: { actionName: 'editDuration' },
    });
    expect(onEstimatePress).toHaveBeenCalledTimes(2);
  });
});

describe('ActivityListItem completion treatment', () => {
  it('matches the Grocery checked-item treatment and strikes through the title', () => {
    renderWithProviders(
      <ActivityListItem
        title="Buy groceries"
        isCompleted
        onToggleComplete={jest.fn()}
      />,
    );

    const completionControl = screen.getByRole('checkbox');
    expect(completionControl.props.accessibilityState).toEqual({ checked: true });

    expect(
      StyleSheet.flatten(screen.getByTestId('activity-completion-indicator').props.style),
    ).toMatchObject({
      width: 22,
      height: 22,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    });
    expect(StyleSheet.flatten(screen.getByTestId('activity-title').props.style)).toMatchObject({
      color: colors.textSecondary,
      textDecorationLine: 'line-through',
    });
  });

  it('supports the shared flat inventory shell and a non-checkbox leading state', () => {
    renderWithProviders(
      <ActivityListItem
        title="Tidy the shoes"
        meta="1 token · Waiting for approval"
        surface="flat"
        showCheckbox={false}
        leadingAccessory={<View testID="pending-review-indicator" />}
        rowAccessibilityLabel="Open details for Tidy the shoes"
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Open details for Tidy the shoes')).toBeTruthy();
    expect(screen.getByTestId('pending-review-indicator')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('activity-list-item-surface').props.style))
      .toMatchObject({
        minHeight: 68,
        borderWidth: 0,
        borderRadius: 0,
        backgroundColor: colors.canvas,
      });
  });

  it('keeps a compact row action on the metadata line', () => {
    renderWithProviders(
      <ActivityListItem
        title="Water the porch plants"
        metaAccessory={<View testID="compact-meta-action" />}
      />,
    );

    expect(screen.getByTestId('activity-meta-row')).toContainElement(
      screen.getByTestId('compact-meta-action'),
    );
  });

  it('labels a read-only completed checkbox with capability-owned language', () => {
    renderWithProviders(
      <ActivityListItem
        title="Put away the breakfast dishes"
        isCompleted
        completionAccessibilityLabel="Put away the breakfast dishes, completed"
      />,
    );

    const completionControl = screen.getByLabelText('Put away the breakfast dishes, completed');
    expect(completionControl.props.accessibilityRole).toBe('checkbox');
    expect(completionControl.props.accessibilityState).toEqual({ checked: true });
  });
});
