jest.mock('react-native-reanimated', () => jest.requireActual('../../.storybook/shims/react-native-reanimated'));

it('loads the app motion tokens with the static Storybook animation shim', () => {
  expect(() => require('../theme/motion')).not.toThrow();
});
