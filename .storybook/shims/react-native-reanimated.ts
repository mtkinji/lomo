import { Animated, Easing } from 'react-native';

export * from 'react-native';

export const useSharedValue = <T,>(value: T) => ({ value });
export const useAnimatedStyle = (factory: () => unknown) => factory();
export const useDerivedValue = <T,>(factory: () => T) => ({ value: factory() });
export const withTiming = <T,>(value: T) => value;
export const withSpring = <T,>(value: T) => value;
export const runOnJS = <T extends (...args: never[]) => unknown>(fn: T) => fn;
export const cancelAnimation = () => undefined;
export const interpolateColor = () => undefined;

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
