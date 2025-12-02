// Expo + NativeWind configuration for React Native Reusables.
// See: https://reactnativereusables.com/docs/installation

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Shim `react-native-svg` to a lightweight JS-only implementation.
// This avoids native crashes like "No component found for view with name
// \"RNSVGPath\"" in environments where the native SVG module isn't available,
// while still letting icon components render safely (as no-ops or simple Views).
config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'react-native-svg': path.resolve(__dirname, 'src/shims/react-native-svg'),
};

module.exports = withNativeWind(config, {
  input: './global.css',
  inlineRem: 16,
});



