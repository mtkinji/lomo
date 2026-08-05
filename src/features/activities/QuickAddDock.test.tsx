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

jest.mock('../../services/HapticsService', () => ({
  HapticsService: { trigger: jest.fn(async () => undefined) },
}));

import { renderWithProviders } from '../../test/renderWithProviders';
import { HapticsService } from '../../services/HapticsService';
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gives the collapsed capture action light press feedback', () => {
    const setIsFocused = jest.fn();
    const { getByTestId } = renderWithProviders(
      <QuickAddDock
        placement="bottomDock"
        value=""
        onChangeText={jest.fn()}
        inputRef={React.createRef<TextInput | null>()}
        isFocused={false}
        setIsFocused={setIsFocused}
        onSubmit={jest.fn()}
        onCollapse={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('e2e.activities.quickAdd.open'));

    expect(HapticsService.trigger).toHaveBeenCalledWith('canvas.selection');
    expect(setIsFocused).toHaveBeenCalledWith(true);
  });

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

  it('matches the resting agent composer inset by default', () => {
    const { getByTestId } = renderWithProviders(
      <QuickAddDock
        placement="bottomDock"
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
      paddingHorizontal: 32,
    });
  });

  it('allows a sibling affordance to reserve space on the right', () => {
    const { getByTestId } = renderWithProviders(
      <QuickAddDock
        placement="bottomDock"
        floatingHorizontalInsetPx={32}
        floatingRightInsetPx={88}
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
      paddingLeft: 32,
      paddingRight: 88,
    });
  });

  it('renders the collapsed floating surface as a full pill', () => {
    const { getByTestId } = renderWithProviders(
      <QuickAddDock
        placement="bottomDock"
        value=""
        onChangeText={jest.fn()}
        inputRef={React.createRef<TextInput | null>()}
        isFocused={false}
        setIsFocused={jest.fn()}
        onSubmit={jest.fn()}
        onCollapse={jest.fn()}
      />,
    );

    expect(StyleSheet.flatten(getByTestId('quick-add-collapsed-surface').props.style)).toMatchObject({
      borderRadius: 999,
    });
  });

  it('matches the inline Goal dock border to to-do rows and offers contextual Chat', () => {
    const onInlineChatPress = jest.fn();
    const { getByLabelText, getByTestId } = renderWithProviders(
      <QuickAddDock
        placement="inline"
        onInlineChatPress={onInlineChatPress}
        inlineChatAccessibilityLabel="Chat about this goal"
        value=""
        onChangeText={jest.fn()}
        inputRef={React.createRef<TextInput | null>()}
        isFocused={false}
        setIsFocused={jest.fn()}
        onSubmit={jest.fn()}
        onCollapse={jest.fn()}
      />,
    );

    expect(StyleSheet.flatten(getByTestId('quick-add-collapsed-surface').props.style)).toMatchObject({
      backgroundColor: '#FFFFFF',
      borderRadius: 999,
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    });
    expect(StyleSheet.flatten(getByTestId('quick-add-collapsed-surface.surface').props.style)).toMatchObject({
      borderWidth: 1,
      borderColor: '#E7E5E4',
    });

    fireEvent.press(getByLabelText('Chat about this goal'));

    expect(onInlineChatPress).toHaveBeenCalledTimes(1);
    expect(HapticsService.trigger).toHaveBeenCalledWith('canvas.selection');
    expect(getByTestId('quick-add-inline-chat-icon')).toBeTruthy();
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

  it('uses the rounded white drawer as the only expanded surface', () => {
    const { getByTestId } = renderWithProviders(<QuickAddHarness />);

    expect(StyleSheet.flatten(getByTestId('quick-add-expanded-composer').props.style)).toMatchObject({
      backgroundColor: 'transparent',
      borderWidth: 0,
    });
  });

  it('joins the expanded white drawer directly to the keyboard without a bottom seam', () => {
    const { getByTestId } = renderWithProviders(<QuickAddHarness />);
    const composer = getByTestId('quick-add-expanded-composer');
    let drawerContent: typeof composer | null = null;
    let ancestor = composer.parent;

    while (ancestor) {
      const style = StyleSheet.flatten(ancestor.props.style);
      if (
        style?.paddingHorizontal === 8 &&
        style?.paddingTop === 8 &&
        style?.backgroundColor === '#FFFFFF' &&
        style?.overflow === 'visible'
      ) {
        drawerContent = ancestor;
        break;
      }
      ancestor = ancestor.parent;
    }

    expect(drawerContent).not.toBeNull();
    expect(StyleSheet.flatten(drawerContent?.props.style)).toMatchObject({
      paddingBottom: 0,
    });
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
