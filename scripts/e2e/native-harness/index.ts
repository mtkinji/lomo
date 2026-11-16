// Install network boundaries before requiring any app modules. Metro assets and
// development transport are the only permitted network destinations.
function assertLocal(input: string) {
  const url = new URL(input);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('External network disabled in native app fixture');
  }
}
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  assertLocal(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  return originalFetch(input, init);
};
const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method: string, url: string | URL, async: boolean = true, username?: string | null, password?: string | null) {
  assertLocal(String(url));
  return originalOpen.call(this, method, String(url), async, username, password);
};
require('react-native-gesture-handler');
require('react-native-reanimated');
const { registerRootComponent } = require('expo');
// The native developer FAB has a larger invisible hit region than its gear icon
// and can intercept drawer-close taps. Change only this disposable test host.
void require('expo-modules-core').requireNativeModule('DevMenuPreferences')
  .setPreferencesAsync({ showFloatingActionButton: false });
const { Platform } = require('react-native');
const Constants = require('expo-constants').default;
const mode = Constants.expoConfig?.extra?.nativeSmokeMode;
// Auth checks mount the unchanged application. Workspace checks mount its
// navigation/overlay subtree only; they do not claim authentication coverage.
if (mode === 'auth') registerRootComponent(require('../../../App').default);
else if (mode === 'workspace') registerRootComponent(require('./WorkspaceHarness').WorkspaceHarness);
else throw new Error('Unknown native fixture entry');
