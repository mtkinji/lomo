import * as React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '../test/renderWithProviders';
import { NarrativeEditableTitle } from './NarrativeEditableTitle';

describe('NarrativeEditableTitle', () => {
  it('restores the required title when an empty edit loses focus', () => {
    const onCommit = jest.fn();

    renderWithProviders(
      <NarrativeEditableTitle
        value="Reach sustainable revenue"
        placeholder="Goal title"
        accessibilityLabel="Edit goal title"
        onCommit={onCommit}
      />,
    );

    fireEvent.press(screen.getByLabelText('Edit goal title'));
    fireEvent.changeText(screen.getByLabelText('Edit goal title'), '');
    fireEvent(screen.getByLabelText('Edit goal title'), 'blur');

    expect(screen.getByText('Reach sustainable revenue')).toBeTruthy();
    expect(screen.queryByText('Title cannot be empty')).toBeNull();
    expect(onCommit).not.toHaveBeenCalled();
  });
});
