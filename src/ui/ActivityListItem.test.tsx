import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '../test/renderWithProviders';
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
