// Expo configuration
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Monorepo / workspaces support: allow Metro to resolve and watch local packages.
// This is required so `@kwilt/*` workspace modules can be consumed by the app.
config.watchFolders = [path.resolve(__dirname, 'packages')];

// Optional: shim `react-native-svg` to a lightweight JS-only implementation.
// This avoids native crashes like "No component found for view with name
// \"RNSVGPath\"" in environments where the native SVG module isn't available.
//
// Default is OFF so we can render SVG illustrations (e.g. onboarding art).
// If you ever need the shim back (e.g. a constrained environment), run with:
//   KWILT_SVG_SHIM=1 expo start
const useSvgShim = process.env.KWILT_SVG_SHIM === '1';
if (useSvgShim) {
  config.resolver = config.resolver || {};
  config.resolver.extraNodeModules = {
    ...(config.resolver.extraNodeModules || {}),
    'react-native-svg': path.resolve(__dirname, 'src/shims/react-native-svg'),
  };
}

module.exports = config;
