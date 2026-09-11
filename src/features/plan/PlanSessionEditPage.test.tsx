import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { typography } from '../../theme';
import { PlanSessionEditPage } from './PlanSessionEditPage';

describe('PlanSessionEditPage', () => {
  it('keeps the editor open while timing is saving', () => {
    const onDone = jest.fn();
    const view = renderWithProviders(
      <PlanSessionEditPage
        title="Work on Adobe presentation"
        start={new Date(2026, 7, 11, 13, 0)}
        end={new Date(2026, 7, 11, 17, 0)}
        isSaving
        onDone={onDone}
      />,
    );
    fireEvent.press(view.getByText('Saving…'));
    expect(onDone).not.toHaveBeenCalled();
    expect(view.queryByText('Done')).toBeNull();
  });

  it('shows the selected session identity at the canonical compact-title scale', () => {
    const onDone = jest.fn();
    const view = renderWithProviders(
      <PlanSessionEditPage
        title="Work on Adobe presentation"
        start={new Date(2026, 7, 11, 13, 0)}
        end={new Date(2026, 7, 11, 17, 0)}
        isSaving={false}
        onDone={onDone}
      />,
    );

    const title = view.getByText('Work on Adobe presentation');
    expect(title.props.numberOfLines).toBe(2);
    expect(StyleSheet.flatten(title.props.style)).toMatchObject({
      fontSize: typography.titleSm.fontSize,
      fontFamily: typography.titleSm.fontFamily,
    });
    expect(view.getByText('1:00 PM - 5:00 PM · 4 hrs')).toBeTruthy();
    expect(view.queryByText('Adjust time')).toBeNull();
    expect(view.queryByText('Details')).toBeNull();
    expect(view.queryByText('Cancel')).toBeNull();
    fireEvent.press(view.getByText('Done'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
