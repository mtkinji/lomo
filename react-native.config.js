// Prevent native autolinking for packages that we only use on the JS/Babel side.
// In particular, `react-native-worklets` requires the New Architecture at the
// native level, but we only need its Babel plugin for NativeWind / CSS interop.
// Disabling iOS/Android platforms here keeps Pods clean while preserving bundler support.
module.exports = {
  dependencies: {
    'react-native-worklets': {
      platforms: {
        ios: null,
        android: null,
      },
    },
  },
};


