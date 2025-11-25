module.exports = function (api) {
  api.cache(true);
  return {
    // `nativewind/babel` is a preset (it returns a `{ plugins: [...] }` config),
    // so it must be listed in `presets` rather than `plugins`.
    presets: ['babel-preset-expo', 'nativewind/babel'],
    plugins: [
      // Reanimated plugin should come last.
      'react-native-reanimated/plugin',
    ],
  };
};


