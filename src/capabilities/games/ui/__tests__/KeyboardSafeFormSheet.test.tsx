import { render } from '@testing-library/react-native';
import { KeyboardAvoidingView, ScrollView, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardSafeFormSheet } from '../KeyboardSafeFormSheet';

describe('KeyboardSafeFormSheet', () => {
  it('keeps a scrollable form body separate from the keyboard-pinned primary action', () => {
    const screen = render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, right: 0, bottom: 34, left: 0 } }}>
        <KeyboardSafeFormSheet
          visible
          eyebrow="PROFILE"
          title="Make it yours"
          onClose={jest.fn()}
          primaryAction={{ label: 'Save player', onPress: jest.fn() }}
        >
          <Text>Form content</Text>
        </KeyboardSafeFormSheet>
      </SafeAreaProvider>,
    );

    const keyboardAvoider = screen.UNSAFE_getByType(KeyboardAvoidingView);
    const scroll = screen.UNSAFE_getByType(ScrollView);
    const body = screen.getByTestId('keyboard-safe-form-body');
    const footer = screen.getByTestId('keyboard-safe-form-footer');

    expect(keyboardAvoider.props.behavior).toBe('padding');
    expect(scroll.props.automaticallyAdjustKeyboardInsets).toBe(true);
    expect(scroll.props.keyboardDismissMode).toBe('interactive');
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
    expect(body).toContainElement(screen.getByText('Form content'));
    expect(body).not.toContainElement(footer);
    expect(footer).toContainElement(screen.getByText('Save player'));
  });
});
