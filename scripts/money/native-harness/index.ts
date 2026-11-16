// Install network boundaries before requiring any app modules. Metro assets and
// development transport are the only permitted network destinations.
function assertLocal(input: string) {
  const url = new URL(input);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('External network disabled in native Budget fixture');
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
const { Platform } = require('react-native');
console.info('[Budget fixture] native React Native version', Platform.constants.reactNativeVersion);
const { Harness } = require('./Harness');
registerRootComponent(Harness);
