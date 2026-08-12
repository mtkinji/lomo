import { fireEvent, render } from '@testing-library/react-native';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { colors, radii } from '../theme';
import { Button, IconButton } from './Button';

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

  it('uses the canonical Sumi pill appearance by default', () => {
    const { getByRole } = render(<Button>Continue</Button>);
    const style = StyleSheet.flatten(getByRole('button').props.style);

    expect(style).toMatchObject({
      backgroundColor: colors.sumi900,
      borderRadius: radii.pill,
    });
  });

  it('requires an explicit accent variant for the Kwilt green fill', () => {
    const { getByRole } = render(<Button variant="accent">Continue</Button>);
    const style = StyleSheet.flatten(getByRole('button').props.style);

    expect(style.backgroundColor).toBe(colors.accent);
  });

  it('owns a consistent disabled treatment', () => {
    const { getByRole } = render(<Button disabled>Continue</Button>);
    const style = StyleSheet.flatten(getByRole('button').props.style);

    expect(style.opacity).toBe(0.5);
  });

  it('uses the same disabled treatment for canonical icon buttons', () => {
    const { getByRole } = render(<IconButton disabled>+</IconButton>);
    const style = StyleSheet.flatten(getByRole('button').props.style);

    expect(style.opacity).toBe(0.5);
  });

  it('presents loading as busy without fading the button like a disabled prerequisite', () => {
    const onPress = jest.fn();
    const { getByRole, getByText, queryByText, UNSAFE_getByType } = render(
      <Button loading loadingLabel="Opening…" onPress={onPress}>Open family choices</Button>,
    );
    const button = getByRole('button');
    const style = StyleSheet.flatten(button.props.style);

    expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    expect(style.opacity).toBeUndefined();
    expect(getByText('Opening…')).toBeTruthy();
    expect(queryByText('Open family choices')).toBeNull();
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('uses the canonical Sumi fill for icon buttons by default', () => {
    const { getByRole } = render(<IconButton>+</IconButton>);
    const style = StyleSheet.flatten(getByRole('button').props.style);

    expect(style.backgroundColor).toBe(colors.sumi900);
  });
});
