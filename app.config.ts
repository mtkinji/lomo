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
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  // Enable React Native New Architecture so SDK 54-compatible libraries like
  // Reanimated and Worklets can install their pods correctly on EAS.
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    // New bundle identifier for the fresh kwilt app.
    bundleIdentifier: 'com.andrewwatanabe.kwilt',
    buildNumber: '2',
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
  plugins: ['expo-font', 'expo-image-picker'],
  extra: {
    eas: {
      // Linked EAS project for the kwilt app (added manually for dynamic config).
      projectId: '7717f04d-8327-47a9-8bb4-84c21dc8214f',
    },
    openAiApiKey: process.env.OPENAI_API_KEY,
  },
};

export default config;


