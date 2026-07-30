import { render } from '@testing-library/react-native';
import { KeyboardAvoidingView, ScrollView, Text } from 'react-native';
import { KeyboardSafeScrollView } from '../KeyboardSafeScrollView';

describe('KeyboardSafeScrollView', () => {
  it('keeps an optional action footer outside its keyboard-aware scroll region', () => {
    const screen = render(
      <KeyboardSafeScrollView footer={<Text>Proceed</Text>}>
        <Text>Input content</Text>
      </KeyboardSafeScrollView>,
    );

    const keyboardAvoider = screen.UNSAFE_getByType(KeyboardAvoidingView);
    const scroll = screen.UNSAFE_getByType(ScrollView);
    const footer = screen.getByTestId('keyboard-safe-screen-footer');

    expect(keyboardAvoider.props.behavior).toBe('padding');
    expect(scroll.props.automaticallyAdjustKeyboardInsets).toBe(true);
    expect(scroll.props.keyboardDismissMode).toBe('interactive');
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
    expect(scroll.props.children).toBeTruthy();
    expect(screen.getByText('Input content')).toBeTruthy();
    expect(footer).toContainElement(screen.getByText('Proceed'));
  });
});
