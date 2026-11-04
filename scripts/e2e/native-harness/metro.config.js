const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const root = path.resolve(__dirname, '../../..');
const config = getDefaultConfig(__dirname);
config.watchFolders = [root];
config.resolver.nodeModulesPaths = [path.join(root, 'node_modules')];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@react-native-async-storage/async-storage') {
    return { type: 'sourceFile', filePath: path.join(root, 'scripts/money/native-harness/memory-storage.ts') };
  }
  if (moduleName.startsWith('@/')) moduleName = path.join(root, moduleName.slice(2));
  return context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
