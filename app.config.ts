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
  name: 'Kwilt',
  slug: 'Kwilt',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  // NOTE: New Architecture is intentionally disabled to keep the dev client stable
  // while we focus on product work. Do NOT flip this to `true` unless:
  //   1) you are explicitly working on New Arch migration on a branch, and
  //   2) you are prepared to debug native/Fabric/TurboModule crashes.
  // See project notes: we want a boring, stable baseline for the next ~3 years.
  newArchEnabled: false,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.andrewwatanabe.lomo',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ['fetch', 'remote-notification'],
    },
  },
  android: {
    package: 'com.andrewwatanabe.lomo',
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
      projectId: '278e7989-ae79-4c0b-8ee7-f4162e2b896f',
    },
    openAiApiKey: process.env.OPENAI_API_KEY,
  },
};

export default config;


