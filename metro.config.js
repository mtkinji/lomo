// Expo configuration
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Monorepo / workspaces support: allow Metro to resolve and watch local packages.
// This is required so `@kwilt/*` workspace modules can be consumed by the app.
config.watchFolders = [path.resolve(__dirname, 'packages')];

/**
 * Fix for occasional double-encoded asset URLs hitting Metro in dev.
 *
 * Symptom:
 * - Metro logs ENOENT scandir for a literal directory like:
 *   /Users/.../Kwilt/.%2Fassets%2Fauth-wallpapers
 *
 * Root cause:
 * - Some callers accidentally encode an already-encoded path segment (e.g. `%2F` -> `%252F`).
 * - Metro decodes URL path segments once; double-encoded slashes remain as `%2F` in the resolved
 *   filesystem path and Metro tries to read that literal folder name.
 *
 * Mitigation:
 * - For /assets/* requests only, decode one level of `%25xx` sequences before Metro processes it.
 */
config.server = config.server || {};
const prevRewriteRequestUrl = config.server.rewriteRequestUrl;
config.server.rewriteRequestUrl = (url) => {
  const rewritten = prevRewriteRequestUrl ? prevRewriteRequestUrl(url) : url;
  if (!rewritten.includes('/assets/') || !rewritten.includes('%25')) return rewritten;
  // Convert "%25xx" -> "%xx" (e.g. "%252F" -> "%2F") and let Metro's normal decoding handle the rest.
  return rewritten.replace(/%25([0-9a-fA-F]{2})/g, '%$1');
};

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
