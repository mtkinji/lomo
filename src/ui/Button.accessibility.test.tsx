import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Button } from './Button';

describe('Button accessibility contract', () => {
  it('exposes button semantics and disabled state by default', () => {
    const { getByRole } = render(<Button disabled>Continue</Button>);

    expect(getByRole('button').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('uses flexible height and expands compact visual targets to 44 points', () => {
    const { getByRole } = render(<Button size="xs">More</Button>);
    const button = getByRole('button');
    const style = StyleSheet.flatten(button.props.style);

    expect(style.height).toBeUndefined();
    expect(style.minHeight).toBe(32);
    expect(button.props.hitSlop).toMatchObject({ top: 6, bottom: 6, left: 6, right: 6 });
  });
});
