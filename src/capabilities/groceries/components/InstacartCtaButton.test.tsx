import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { InstacartCtaButton, INSTACART_CTA_STYLE } from './InstacartCtaButton';

describe('InstacartCtaButton', () => {
  it('uses Instacart approved copy and white-theme dimensions', () => {
    const screen = render(<InstacartCtaButton onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Shop on Instacart' })).toHaveStyle({
      backgroundColor: '#FFFFFF',
      borderColor: '#E8E9EB',
      borderRadius: 29.5,
      height: 46,
    });
    expect(StyleSheet.flatten(screen.UNSAFE_getByProps({ testID: 'instacart-carrot-mark' }).props.style)).toMatchObject({
      height: INSTACART_CTA_STYLE.logoSize,
      width: INSTACART_CTA_STYLE.logoSize,
    });
  });

  it('announces the busy state and prevents another press', () => {
    const onPress = jest.fn();
    const screen = render(<InstacartCtaButton busy onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Preparing Instacart list' });

    expect(button.props.accessibilityState).toEqual({ disabled: true, busy: true });
    button.props.onPress?.();
    expect(onPress).not.toHaveBeenCalled();
  });
});
