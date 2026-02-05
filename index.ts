import 'react-native-gesture-handler';
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';
import { registerRootComponent } from 'expo';

import App from './App';

/**
 * Hermes ReferenceError safety shim
 * -------------------------------
 * Hermes throws `ReferenceError: Property 'operator' doesn't exist` when some code
 * (often from a third-party bundle or an eval'd snippet) accidentally references
 * a bare `operator` identifier in the global scope.
 *
 * We defensively define the global property so the app doesn't crash during
 * onboarding/guide testing. If you find the true source, remove this shim.
 */
try {
  if (typeof (globalThis as any).operator === 'undefined') {
    (globalThis as any).operator = undefined;
  }
} catch {
  // best-effort
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
