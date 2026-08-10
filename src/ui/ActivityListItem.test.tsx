import React from 'react';
import { StyleSheet } from 'react-native';
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
});
