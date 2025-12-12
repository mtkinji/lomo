module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated plugin should come last.
      'react-native-reanimated/plugin',
    ],
  };
};
