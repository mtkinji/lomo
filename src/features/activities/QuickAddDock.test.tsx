import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { StyleSheet, type TextInput } from 'react-native';

jest.mock('../../ui/UnderKeyboardDrawer', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    UnderKeyboardDrawer: ({ visible, children }: any) =>
      visible ? React.createElement(View, { testID: 'under-keyboard-drawer' }, children) : null,
  };
});

import { renderWithProviders } from '../../test/renderWithProviders';
import { QuickAddDock } from './QuickAddDock';

function QuickAddHarness() {
  const [value, setValue] = React.useState('');
  const [isFocused, setIsFocused] = React.useState(true);
  const inputRef = React.useRef<TextInput | null>(null);

  return (
    <QuickAddDock
      value={value}
      onChangeText={setValue}
      inputRef={inputRef}
      isFocused={isFocused}
      setIsFocused={setIsFocused}
      onSubmit={jest.fn()}
      onCollapse={() => setIsFocused(false)}
    />
  );
}

describe('QuickAddDock', () => {
  it('keeps the native text input multiline while the title grows past one visual row', () => {
    const { getByTestId } = renderWithProviders(<QuickAddHarness />);
    const input = getByTestId('e2e.activities.quickAdd.input');

    expect(input.props.multiline).toBe(true);

    fireEvent.changeText(
      input,
      'The only way I could do that was if you had to write enough text to wrap.',
    );

    expect(getByTestId('e2e.activities.quickAdd.input').props.multiline).toBe(true);
  });

  it('keeps typed text on the same baseline as the placeholder', () => {
    const { getByTestId } = renderWithProviders(<QuickAddHarness />);
    const input = getByTestId('e2e.activities.quickAdd.input');

    fireEvent.changeText(input, 'Call Jenny');

    expect(StyleSheet.flatten(getByTestId('e2e.activities.quickAdd.input').props.style)?.transform).toBeUndefined();
  });
});
