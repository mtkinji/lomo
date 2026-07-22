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
  it('keeps an inferred place question attached to the collapsed dock', () => {
    const onSetPlaceAlert = jest.fn();
    const onReviewPlaceReceipt = jest.fn();
    const onDismissPlaceReceipt = jest.fn();
    const { getByLabelText, getByText, getByTestId } = renderWithProviders(
      <QuickAddDock
        placement="bottomDock"
        value=""
        onChangeText={jest.fn()}
        inputRef={React.createRef<TextInput | null>()}
        isFocused={false}
        setIsFocused={jest.fn()}
        onSubmit={jest.fn()}
        onCollapse={jest.fn()}
        placeReceipt={{
          activityId: 'activity-costco',
          activityTitle: 'Pick up prescriptions from Costco',
          location: {
            label: 'Costco Wholesale',
            latitude: 40.7128,
            longitude: -74.006,
            trigger: 'arrive',
            radiusM: 150,
          },
        }}
        onSetPlaceAlert={onSetPlaceAlert}
        onReviewPlaceReceipt={onReviewPlaceReceipt}
        onDismissPlaceReceipt={onDismissPlaceReceipt}
      />,
    );

    expect(getByTestId('quick-add-place-receipt')).toBeTruthy();
    expect(getByText('Created · Pick up prescriptions from Costco')).toBeTruthy();
    expect(getByText('Costco Wholesale added')).toBeTruthy();

    fireEvent.press(getByLabelText('Set location alert'));
    fireEvent.press(getByLabelText('Review location'));
    fireEvent.press(getByLabelText('Dismiss location receipt'));

    expect(onSetPlaceAlert).toHaveBeenCalledTimes(1);
    expect(onReviewPlaceReceipt).toHaveBeenCalledTimes(1);
    expect(onDismissPlaceReceipt).toHaveBeenCalledTimes(1);
  });

  it('asks the user to choose a branch for a broad inferred merchant', () => {
    const onReviewPlaceReceipt = jest.fn();
    const { getByLabelText, getByText, queryByLabelText } = renderWithProviders(
      <QuickAddDock
        placement="bottomDock"
        value=""
        onChangeText={jest.fn()}
        inputRef={React.createRef<TextInput | null>()}
        isFocused={false}
        setIsFocused={jest.fn()}
        onSubmit={jest.fn()}
        onCollapse={jest.fn()}
        placeReceipt={{
          activityId: 'activity-costco',
          activityTitle: 'Pick up prescriptions from Costco',
          placeLink: {
            target: { kind: 'named', label: 'Costco', query: 'Costco' },
            intent: 'pickup',
            resolution: 'broad',
            provenance: { source: 'activity_text', confidence: 0.85 },
          },
        }}
        onReviewPlaceReceipt={onReviewPlaceReceipt}
      />,
    );

    expect(getByText('Costco · choose a place')).toBeTruthy();
    expect(queryByLabelText('Set location alert')).toBeNull();
    fireEvent.press(getByLabelText('Choose place'));
    expect(onReviewPlaceReceipt).toHaveBeenCalledTimes(1);
  });

  it('allows a host surface to align the floating dock with its own content gutter', () => {
    const { getByTestId } = renderWithProviders(
      <QuickAddDock
        placement="bottomDock"
        floatingHorizontalInsetPx={0}
        value=""
        onChangeText={jest.fn()}
        inputRef={React.createRef<TextInput | null>()}
        isFocused={false}
        setIsFocused={jest.fn()}
        onSubmit={jest.fn()}
        onCollapse={jest.fn()}
      />,
    );

    expect(StyleSheet.flatten(getByTestId('quick-add-floating-dock').props.style)).toMatchObject({
      left: 0,
      right: 0,
      paddingHorizontal: 0,
    });
  });

  it('uses a contextual placeholder for the collapsed and expanded composer', () => {
    const inputRef = React.createRef<TextInput | null>();
    const { getByLabelText, getByTestId, rerender } = renderWithProviders(
      <QuickAddDock
        placement="inline"
        placeholder="Add a new to-do"
        value=""
        onChangeText={jest.fn()}
        inputRef={inputRef}
        isFocused={false}
        setIsFocused={jest.fn()}
        onSubmit={jest.fn()}
        onCollapse={jest.fn()}
      />,
    );

    expect(getByLabelText('Add a new to-do')).toBeTruthy();

    rerender(
      <QuickAddDock
        placement="inline"
        placeholder="Add a new to-do"
        value=""
        onChangeText={jest.fn()}
        inputRef={inputRef}
        isFocused
        setIsFocused={jest.fn()}
        onSubmit={jest.fn()}
        onCollapse={jest.fn()}
      />,
    );

    expect(getByLabelText('To-do title')).toBeTruthy();
    expect(getByTestId('e2e.activities.quickAdd.input').props.placeholder).toBe('Add a new to-do');
  });

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
