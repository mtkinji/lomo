import * as React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '../test/renderWithProviders';
import { NarrativeEditableTitle } from './NarrativeEditableTitle';
import { KeyboardAwareScrollContext } from './KeyboardAwareScrollView';

describe('NarrativeEditableTitle', () => {
  it('requests host reveal when an editing title grows with the keyboard open without committing', () => {
    jest.useFakeTimers();
    const reveal = jest.fn();
    const onCommit = jest.fn();
    renderWithProviders(<KeyboardAwareScrollContext.Provider value={{keyboardHeight: 300, keyboardClearance: 16, scrollToFocusedInput: reveal}}>
      <NarrativeEditableTitle value="Original" accessibilityLabel="Edit title" onCommit={onCommit} />
    </KeyboardAwareScrollContext.Provider>);
    fireEvent.press(screen.getByLabelText('Edit title'));
    fireEvent(screen.getByLabelText('Edit title'), 'contentSizeChange', {nativeEvent: {contentSize: {width: 300, height: 500}}});
    act(() => jest.runOnlyPendingTimers());
    expect(reveal).toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Edit title').props.scrollEnabled).toBe(false);
    jest.useRealTimers();
  });
  it('keeps a changed title local until blur, then commits the trimmed value', () => {
    const onCommit = jest.fn();
    renderWithProviders(<NarrativeEditableTitle value="Original" accessibilityLabel="Edit title" onCommit={onCommit} />);
    fireEvent.press(screen.getByLabelText('Edit title'));
    fireEvent.changeText(screen.getByLabelText('Edit title'), '  Revised title  ');
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent(screen.getByLabelText('Edit title'), 'blur');
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('Revised title');
  });

  it('does not write an unchanged title when editing ends', () => {
    const onCommit = jest.fn();
    renderWithProviders(<NarrativeEditableTitle value="Original" accessibilityLabel="Edit title" onCommit={onCommit} />);
    fireEvent.press(screen.getByLabelText('Edit title'));
    fireEvent.changeText(screen.getByLabelText('Edit title'), '  Original  ');
    fireEvent(screen.getByLabelText('Edit title'), 'blur');
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('keeps an invalid draft available for correction without committing it', () => {
    const onCommit = jest.fn();
    renderWithProviders(<NarrativeEditableTitle value="Original" accessibilityLabel="Edit title" onCommit={onCommit} validate={() => 'Choose another title'} />);
    fireEvent.press(screen.getByLabelText('Edit title'));
    fireEvent.changeText(screen.getByLabelText('Edit title'), 'Invalid');
    fireEvent(screen.getByLabelText('Edit title'), 'blur');
    expect(screen.getByLabelText('Edit title').props.value).toBe('Invalid');
    expect(screen.getByText('Choose another title')).toBeTruthy();
    expect(onCommit).not.toHaveBeenCalled();
  });

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
