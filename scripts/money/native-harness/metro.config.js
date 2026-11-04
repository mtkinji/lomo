const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const root = path.resolve(__dirname, '../../..');
const config = getDefaultConfig(__dirname);
config.watchFolders = [root];
config.resolver.nodeModulesPaths = [path.join(root, 'node_modules')];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const fixture = (name) => ({ type: 'sourceFile', filePath: path.join(__dirname, name) });
  if (moduleName.endsWith('/MoneyDataContext')) return fixture('fixture.ts');
  if (moduleName.endsWith('/supabaseClient')) return fixture('blocked-backend.ts');
  if (moduleName.endsWith('/posthogClient')) return fixture('blocked-backend.ts');
  if (moduleName === '@react-native-async-storage/async-storage') return fixture('memory-storage.ts');
  if (moduleName.startsWith('@/')) moduleName = path.join(root, moduleName.slice(2));
  return context.resolveRequest(context, moduleName, platform);
};
// Metro owns content-based invalidation; reuse transforms, never test receipts.
if (process.env.KWILT_METRO_CACHE_DIR) {
  const { FileStore } = require('metro-cache');
  config.cacheStores = [new FileStore({ root: path.join(process.env.KWILT_METRO_CACHE_DIR, 'budget') })];
}
module.exports = config;
