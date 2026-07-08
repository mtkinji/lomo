import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { StyleSheet, type TextInput } from 'react-native';

jest.mock('../../ui/UnderKeyboardDrawer', () => {
  const React = require('react');
  const { View } = require('react-native');
  type MockUnderKeyboardDrawerProps = {
    children?: React.ReactNode;
    visible?: boolean;
    maxVisibleContentHeightPx?: number;
    visibleContentHeightFallbackPx?: number;
  };

  return {
    UnderKeyboardDrawer: ({ visible, children, ...props }: MockUnderKeyboardDrawerProps) =>
      visible ? React.createElement(View, { testID: 'under-keyboard-drawer', ...props }, children) : null,
  };
});

jest.mock('../../ui/DropdownMenu', () => {
  const React = require('react');

  type MockDropdownProps = {
    children?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  };
  type MockTriggerChildProps = {
    onPress?: () => void;
  };

  const MenuContext = React.createContext({
    open: false,
    onOpenChange: () => undefined,
  });

  const DropdownMenu = ({ children, open = false, onOpenChange = () => undefined }: MockDropdownProps) =>
    React.createElement(
      MenuContext.Provider,
      { value: { open, onOpenChange } },
      children,
    );
  const DropdownMenuTrigger = ({ children }: MockDropdownProps) => {
    const context = React.useContext(MenuContext);
    const child = React.Children.only(children) as React.ReactElement<MockTriggerChildProps>;

    return React.cloneElement(child, {
      onPress: () => context.onOpenChange(!context.open),
    });
  };
  const Passthrough = ({ children }: MockDropdownProps) => React.createElement(React.Fragment, null, children);

  return {
    DropdownMenu,
    DropdownMenuContent: Passthrough,
    DropdownMenuTrigger,
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

  it('clamps the keyboard drawer to the measured composer height', () => {
    const { getByTestId } = renderWithProviders(<QuickAddHarness />);
    const drawer = getByTestId('under-keyboard-drawer');

    expect(drawer.props.maxVisibleContentHeightPx).toBe(drawer.props.visibleContentHeightFallbackPx);
  });

  it('renders AI action switch thumbs with animated transforms', () => {
    const { getByLabelText, getByTestId } = renderWithProviders(<QuickAddHarness />);

    fireEvent.press(getByLabelText('AI actions'));

    const thumbStyle = StyleSheet.flatten(getByTestId('e2e.activities.quickAdd.aiAction.steps.thumb').props.style);

    expect(thumbStyle?.transform).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          translateX: expect.anything(),
        }),
      ]),
    );
  });
});
