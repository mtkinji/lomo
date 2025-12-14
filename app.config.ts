import type { ExpoConfig } from 'expo/config';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';

const NODE_ENV = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development';
const projectRoot = __dirname;

// Silence noisy dotenv tips when loading multiple files.
if (!process.env.DOTENV_CONFIG_QUIET) {
  process.env.DOTENV_CONFIG_QUIET = 'true';
}

const envFiles = [
  '.env',
  `.env.${NODE_ENV}`,
  '.env.local',
  `.env.${NODE_ENV}.local`,
];

envFiles.forEach((file) => {
  const fullPath = path.resolve(projectRoot, file);
  if (existsSync(fullPath)) {
    loadEnv({ path: fullPath, override: true });
  }
});

const config: ExpoConfig = {
  name: 'kwilt',
  // Expo project slug (used for URLs and EAS) – keep lowercase.
  slug: 'kwilt',
  // Marketing version (visible in the App Store / Settings).
  version: '1.0.3',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  notification: {
    // Use a flat, monochrome logo for the small status-bar icon on Android.
    // This should be a white glyph on a transparent background.
    icon: './assets/icon.png',
    color: '#1F5226',
  },
  // Enable React Native New Architecture so SDK 54-compatible libraries like
  // Reanimated and Worklets can install their pods correctly on EAS.
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    // Pine 300 (matches in-app LaunchScreen background).
    backgroundColor: '#B7CFB5',
  },
  ios: {
    supportsTablet: true,
    // New bundle identifier for the fresh kwilt app.
    bundleIdentifier: 'com.andrewwatanabe.kwilt',
    // Internal build number for TestFlight/App Store (must be monotonically increasing).
    buildNumber: '8',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ['fetch', 'remote-notification'],
    },
  },
  android: {
    // New Android applicationId / package for kwilt.
    package: 'com.andrewwatanabe.kwilt',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-font', 'expo-image-picker', 'expo-notifications'],
  extra: {
    eas: {
      // Linked EAS project for the kwilt app (added manually for dynamic config).
      projectId: '7717f04d-8327-47a9-8bb4-84c21dc8214f',
    },
    // Prefer testing key if available (for Arc Testing dev tooling), otherwise fall back to main key
    openAiApiKey: process.env.OPENAI_ARK_TESTING_KEY ?? process.env.OPENAI_API_KEY,
    giphyApiKey: process.env.GIPHY_API_KEY,
    // Unsplash Access Key (Client ID). Support a few common env var names so
    // local/dev setups don't silently break.
    unsplashAccessKey:
      process.env.UNSPLASH_ACCESS_KEY ??
      process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY ??
      process.env.UNSPLASH_API_KEY,
    // Expose the resolved environment to the app runtime so we can distinguish
    // production installs from development/preview for things like demo data.
    environment: NODE_ENV,
  },
};

export default config;


