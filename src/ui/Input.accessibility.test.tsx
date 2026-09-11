import { act, fireEvent, render } from '@testing-library/react-native';
import { createRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Input } from './Input';
import { KeyboardAwareScrollContext } from './KeyboardAwareScrollView';
import { InputFrame } from './InputFrame';

describe('Input accessibility contract', () => {
  it.each(['plain', 'inline'] as const)('keeps a focused %s editor borderless inside its host', variant => {
    const view = render(<Input variant={variant} label="Draft" />);
    fireEvent(view.getByLabelText('Draft'), 'focus', {nativeEvent: {}});
    const indicators = () => view.UNSAFE_getAllByType(View).filter(node => node.props.pointerEvents === 'none');
    expect(indicators()).toHaveLength(0);
    view.rerender(<Input variant={variant} label="Draft" errorText="Check this value" />);
    expect(indicators()).toHaveLength(1);
    expect(view.getByLabelText('Draft').props.accessibilityHint).toBe('Check this value');
  });
  it.each(['filled', 'outline'] as const)('retains the focus indicator on a %s field', variant => {
    const view = render(<Input variant={variant} label="Search" />);
    fireEvent(view.getByLabelText('Search'), 'focus', {nativeEvent: {}});
    expect(view.UNSAFE_getAllByType(View).filter(node => node.props.pointerEvents === 'none')).toHaveLength(1);
  });

  it('asks its host to clear the whole field frame when focus opens or switches the keyboard', () => {
    jest.useFakeTimers();
    const measure = jest.spyOn(require('react-native'), 'findNodeHandle').mockReturnValue(42);
    const registerFocusedInputFrame = jest.fn();
    const scrollToFocusedInput = jest.fn();
    const editor = (keyboardHeight: number) => <KeyboardAwareScrollContext.Provider value={{ keyboardHeight, keyboardClearance: 16, registerFocusedInputFrame, scrollToFocusedInput }}>
      <Input label="Area" />
    </KeyboardAwareScrollContext.Provider>;
    const view = render(editor(0), { createNodeMock: () => ({}) });
    fireEvent(view.getByLabelText('Area'), 'focus', { nativeEvent: {} });
    expect(registerFocusedInputFrame).toHaveBeenCalledWith(42);
    view.rerender(editor(300));
    fireEvent(view.getByLabelText('Area'), 'focus', { nativeEvent: {} });
    act(() => jest.runOnlyPendingTimers());
    expect(registerFocusedInputFrame).toHaveBeenCalledTimes(2);
    expect(scrollToFocusedInput).toHaveBeenCalledTimes(1);
    measure.mockRestore();
    jest.useRealTimers();
  });
  it('lets the whole field share a row with an action without taking the full row width', () => {
    const { UNSAFE_getByType } = render(<Input label="Area" wrapperStyle={{ flex: 1, width: undefined, minWidth: 0 }} />);
    expect(StyleSheet.flatten(UNSAFE_getByType(Input).findAllByType(View)[0].props.style)).toMatchObject({ flex: 1, width: undefined, minWidth: 0 });
  });
  it('keeps the same native editor, value, selection and callbacks across focus in the unified frame', () => {
    const ref = createRef<TextInput>();
    const change = jest.fn();
    const submit = jest.fn();
    const focus = jest.fn();
    const {getByLabelText, rerender} = render(<Input ref={ref} label="Code" value="1234" selection={{start: 2, end: 2}} keyboardType="number-pad" onChangeText={change} onSubmitEditing={submit} onFocus={focus} />);
    const native = ref.current;
    fireEvent(getByLabelText('Code'), 'focus', {nativeEvent: {}});
    expect(ref.current).toBe(native);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(getByLabelText('Code').props).toMatchObject({value: '1234', selection: {start: 2, end: 2}, keyboardType: 'number-pad'});
    fireEvent.changeText(getByLabelText('Code'), '1235');
    expect(change).toHaveBeenCalledWith('1235');
    expect(submit).not.toHaveBeenCalled();
    rerender(<Input ref={ref} label="Code" value="1235" errorText="Check this code" />);
    expect(ref.current).toBe(native);
    expect(getByLabelText('Code').props.accessibilityHint).toBe('Check this code');
  });

  it('keeps a full-pane draft and native editor while its host shrinks and expands', () => {
    const ref = createRef<TextInput>();
    const draft = 'A long message\n'.repeat(50);
    const editor = (height: number) => <Input ref={ref} variant="plain" accessibilityLabel="Message" value={draft} multiline multilineMinHeight={height} multilineMaxHeight={height} />;
    const {getByLabelText, rerender} = render(editor(500));
    const native = ref.current;
    fireEvent(getByLabelText('Message'), 'contentSizeChange', {nativeEvent: {contentSize: {width: 300, height: 1200}}});
    expect(StyleSheet.flatten(getByLabelText('Message').props.style).height).toBe(500);
    rerender(editor(180));
    expect(StyleSheet.flatten(getByLabelText('Message').props.style)).toMatchObject({height: 180, minHeight: 180});
    expect(getByLabelText('Message').props.value).toBe(draft);
    expect(ref.current).toBe(native);
    rerender(editor(500));
    expect(StyleSheet.flatten(getByLabelText('Message').props.style).height).toBe(500);
    expect(ref.current).toBe(native);
  });

  it('reclaims measured footer room when composer tools disappear', () => {
    const editor = (footer: boolean) => <KeyboardAwareScrollContext.Provider value={{viewportHeight: 180, keyboardHeight: 346, keyboardClearance: 16, scrollToFocusedInput: jest.fn()}}>
      <Input surfaceRole="composer" label="Post" multiline value="Draft" footerElement={footer ? <View /> : undefined} />
    </KeyboardAwareScrollContext.Provider>;
    const {getByLabelText, UNSAFE_getByType, rerender} = render(editor(true));
    const initial = StyleSheet.flatten(getByLabelText('Post').props.style).maxHeight;
    fireEvent(UNSAFE_getByType(InputFrame), 'footerHeight', 44);
    expect(StyleSheet.flatten(getByLabelText('Post').props.style).maxHeight).toBe(initial - 44);
    rerender(editor(false));
    expect(StyleSheet.flatten(getByLabelText('Post').props.style).maxHeight).toBe(initial);
  });
  it('keeps a multiline editor inside the available viewport as the keyboard grows', () => {
    const editor = (viewportHeight: number) => (
      <KeyboardAwareScrollContext.Provider value={{
        viewportHeight, keyboardHeight: 346, keyboardClearance: 16,
        scrollToFocusedInput: jest.fn(),
      }}>
        <Input label="Notes" multiline value={'A long note\n'.repeat(20)} />
      </KeyboardAwareScrollContext.Provider>
    );
    const { getByLabelText, rerender } = render(editor(180));
    expect(StyleSheet.flatten(getByLabelText('Notes').props.style).maxHeight).toBe(164);
    rerender(editor(80));
    expect(StyleSheet.flatten(getByLabelText('Notes').props.style)).toMatchObject({ minHeight: 64, maxHeight: 64 });
  });

  it('programmatically names the text field from its visible label', () => {
    const { getByLabelText } = render(<Input label="Email address" value="" />);

    expect(getByLabelText('Email address')).toBeTruthy();
  });

  it('restores the content height when the keyboard leaves more room without another content event', () => {
    const editor = (viewportHeight: number) => (
      <KeyboardAwareScrollContext.Provider value={{
        viewportHeight, keyboardHeight: 346, keyboardClearance: 16,
        scrollToFocusedInput: jest.fn(),
      }}>
        <Input label="Notes" multiline value={'A long note\n'.repeat(20)} />
      </KeyboardAwareScrollContext.Provider>
    );
    const { getByLabelText, rerender } = render(editor(220));
    rerender(editor(140));
    fireEvent(getByLabelText('Notes'), 'contentSizeChange', {
      nativeEvent: { contentSize: { width: 300, height: 400 } },
    });
    expect(StyleSheet.flatten(getByLabelText('Notes').props.style).height).toBe(124);
    rerender(editor(220));
    expect(StyleSheet.flatten(getByLabelText('Notes').props.style).height).toBe(204);
  });

  it('exposes validation feedback to assistive technology', () => {
    const { getByLabelText, getByText } = render(
      <Input label="Goal title" errorText="A title is required" value="" />,
    );

    expect(getByLabelText('Goal title').props.accessibilityHint).toBe('A title is required');
    expect(getByText('A title is required').props.accessibilityLiveRegion).toBe('polite');
    expect(getByText('A title is required').props.accessibilityRole).toBe('alert');
  });

  it('preserves an explicit accessible name and hint', () => {
    const { getByLabelText } = render(
      <Input
        label="Amount"
        accessibilityLabel="Monthly amount"
        accessibilityHint="Enter dollars"
        value=""
      />,
    );

    expect(getByLabelText('Monthly amount').props.accessibilityHint).toBe('Enter dollars');
  });
});
