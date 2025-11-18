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
  name: 'LOMO',
  slug: 'LOMO',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.anonymous.LOMO',
  },
  android: {
    package: 'com.anonymous.LOMO',
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
  plugins: ['expo-font'],
  extra: {
    openAiApiKey: process.env.OPENAI_API_KEY,
  },
};

export default config;


