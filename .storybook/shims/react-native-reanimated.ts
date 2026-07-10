import { Animated, Easing } from 'react-native';

export * from 'react-native';

export const useSharedValue = <T,>(value: T) => ({ value });
export const useAnimatedStyle = (factory: () => unknown) => factory();
export const useAnimatedProps = (factory: () => unknown) => factory();
export const useAnimatedRef = () => ({ current: null });
export const useEvent = <T,>(handler: T) => handler;
export const useAnimatedScrollHandler = <T,>(handler: T) => handler;
export const useDerivedValue = <T,>(factory: () => T) => ({ value: factory() });
export const withTiming = <T,>(
  value: T,
  _config?: unknown,
  callback?: (finished?: boolean, current?: T) => void,
) => {
  callback?.(true, value);
  return value;
};
export const withSpring = <T,>(
  value: T,
  _config?: unknown,
  callback?: (finished?: boolean, current?: T) => void,
) => {
  callback?.(true, value);
  return value;
};
export const withDelay = <T,>(_delayMs: number, value: T) => value;
export const withRepeat = <T,>(value: T) => value;
export const withSequence = <T,>(...values: T[]) => values[values.length - 1];
export const runOnJS = <T extends (...args: never[]) => unknown>(fn: T) => fn;
export const runOnUI = <T extends (...args: never[]) => unknown>(fn: T) => fn;
export const cancelAnimation = () => undefined;
export const measure = () => null;
export const clamp = (value: number, lowerBound: number, upperBound: number) =>
  Math.min(Math.max(value, lowerBound), upperBound);
export const interpolate = (
  value: number,
  inputRange: number[],
  outputRange: number[],
) => {
  if (inputRange.length < 2 || outputRange.length < 2) return outputRange[0] ?? value;
  const inputStart = inputRange[0];
  const inputEnd = inputRange[inputRange.length - 1];
  const outputStart = outputRange[0];
  const outputEnd = outputRange[outputRange.length - 1];
  if (inputEnd === inputStart) return outputEnd;
  const progress = (value - inputStart) / (inputEnd - inputStart);
  return outputStart + progress * (outputEnd - outputStart);
};
export const interpolateColor = () => undefined;
export const setGestureState = () => undefined;

export const Extrapolation = {
  CLAMP: 'clamp',
  EXTEND: 'extend',
  IDENTITY: 'identity',
} as const;

export const ReduceMotion = {
  Always: 'always',
  Never: 'never',
  System: 'system',
} as const;

function createAnimationBuilder() {
  const builder = {
    duration: () => builder,
    easing: () => builder,
    delay: () => builder,
    springify: () => builder,
  };

  return builder;
}

export const FadeIn = createAnimationBuilder();
export const FadeInDown = createAnimationBuilder();
export const FadeOut = createAnimationBuilder();
export const FadeOutUp = createAnimationBuilder();
export const Layout = createAnimationBuilder();

export { Easing };

export default Animated;
