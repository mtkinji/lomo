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
  // Custom URL scheme for deep links like `kwilt://activity/<id>?openFocus=1`.
  scheme: 'kwilt',
  // Ensure this project is owned/billed under the Kwilt organization in Expo.
  // (You still need to transfer the existing project in the Expo dashboard.)
  owner: 'kwilt',
  // Expo project slug (used for URLs and EAS) – keep lowercase.
  slug: 'kwilt',
  // Marketing version (visible in the App Store / Settings).
  version: '1.0.7',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  notification: {
    // Use a flat, monochrome logo for the small status-bar icon on Android.
    // This should be a white glyph on a transparent background.
    icon: './assets/icon.png',
    color: '#1F5226',
  },
  // NOTE:
  // Reanimated v4+ requires the New Architecture on iOS (pods assert otherwise).
  // We keep New Arch enabled and instead guard against native SVG crashes by
  // optionally shimming `react-native-svg` at bundle time via `KWILT_SVG_SHIM=1`
  // (see `metro.config.js`).
  newArchEnabled: true,
  splash: {
    image: './assets/icon.png',
    resizeMode: 'contain',
    // Pine 300 (matches in-app LaunchScreen background).
    backgroundColor: '#8EAF8B',
  },
  ios: {
    supportsTablet: true,
    // New bundle identifier for the fresh kwilt app.
    bundleIdentifier: 'com.andrewwatanabe.kwilt',
    // Required for signing additional targets created at prebuild time (e.g. widgets).
    appleTeamId: 'BK3N7YXHN7',
    // Internal build number for TestFlight/App Store (must be monotonically increasing).
    buildNumber: '23',
    // iOS app extensions (WidgetKit) are created at prebuild time via `withAppleEcosystemIntegrations`.
    // We declare the extension bundle id here so EAS credentials/build can provision/sign it too.
    // NOTE: ExpoConfig's `ios` type may not include this field yet; keep the runtime config anyway.
    // @ts-expect-error - `appExtensions` isn't typed in ExpoConfig yet, but is consumed by EAS tooling.
    appExtensions: [
      {
        targetName: 'KwiltWidgets',
        bundleIdentifier: 'com.andrewwatanabe.kwilt.widgets',
      },
    ],
    // Universal Links (deep link from https://go.kwilt.app/* and https://kwilt.app/*).
    // Requires `apple-app-site-association` to be served from those domains.
    associatedDomains: ['applinks:go.kwilt.app', 'applinks:kwilt.app'],
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      // Enable Live Activities for Focus countdown (ActivityKit).
      NSSupportsLiveActivities: true,
      // Allow `Linking.canOpenURL('ms-outlook://...')` to detect Outlook installs.
      LSApplicationQueriesSchemes: ['ms-outlook'],
      // Needed for soundscapes to continue playing when the screen locks.
      UIBackgroundModes: ['audio', 'fetch', 'remote-notification', 'location'],
      // Location offers (geofence enter/exit) permission strings.
      NSLocationWhenInUseUsageDescription:
        'Kwilt uses your location to set up activity places and show maps.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Kwilt uses your location in the background to nudge you when you arrive or leave a place for an activity.',
      // ExpoCalendar: required usage strings. Without these, iOS can crash at runtime
      // when the Calendar module initializes.
      NSCalendarsUsageDescription:
        'Kwilt uses your calendar to schedule activities you choose to add.',
      NSRemindersUsageDescription:
        'Kwilt uses reminders only if you choose to add activities as reminders.',
    },
  },
  android: {
    // New Android applicationId / package for kwilt.
    package: 'com.andrewwatanabe.kwilt',
    // Must be monotonically increasing for Play uploads.
    versionCode: 23,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      // Required for geofence triggers to work reliably in the background on Android 10+.
      'ACCESS_BACKGROUND_LOCATION',
    ],
    // Android App Links (deep link from https://go.kwilt.app/* and https://kwilt.app/*).
    // Requires `/.well-known/assetlinks.json` to be served from those domains.
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        category: ['BROWSABLE', 'DEFAULT'],
        data: [
          { scheme: 'https', host: 'go.kwilt.app', pathPrefix: '/i/' },
          { scheme: 'https', host: 'go.kwilt.app', pathPrefix: '/r/' },
          { scheme: 'https', host: 'kwilt.app', pathPrefix: '/i/' },
          { scheme: 'https', host: 'kwilt.app', pathPrefix: '/r/' },
        ],
      },
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-font',
    'expo-image-picker',
    'expo-notifications',
    'expo-localization',
    'expo-location',
    './plugins/withAppleEcosystemIntegrations',
  ],
  extra: {
    eas: {
      // Linked EAS project for the kwilt app (added manually for dynamic config).
      projectId: '7717f04d-8327-47a9-8bb4-84c21dc8214f',
    },
    // EAS build profile name (e.g. "development", "preview", "production").
    // Useful at runtime to hide internal tooling in store builds while still
    // allowing it in internal distributions.
    easBuildProfile: process.env.EAS_BUILD_PROFILE,
    // AI proxy base URL (no OpenAI keys in the client).
    // Example (Supabase Edge Functions): https://<project-ref>.functions.supabase.co/functions/v1/ai-chat
    // Local (Supabase CLI): http://localhost:54321/functions/v1/ai-chat
    aiProxyBaseUrl: process.env.AI_PROXY_BASE_URL ?? process.env.EXPO_PUBLIC_AI_PROXY_BASE_URL,
    // Supabase API key used ONLY to satisfy the Edge Functions gateway when JWT verification is enabled.
    // Safe to embed: use the project's publishable/anon key (never service_role).
    supabasePublishableKey:
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    // Supabase project URL (safe to embed). Required for Supabase Auth + shared goals.
    // Example: https://<project-ref>.supabase.co
    supabaseUrl: process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL,
    giphyApiKey: process.env.GIPHY_API_KEY,
    // Unsplash Access Key (Client ID). Support a few common env var names so
    // local/dev setups don't silently break.
    unsplashAccessKey:
      process.env.UNSPLASH_ACCESS_KEY ??
      process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY ??
      process.env.UNSPLASH_API_KEY,
    // RevenueCat (iOS subscriptions)
    revenueCatApiKey:
      process.env.REVENUECAT_API_KEY ??
      process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ??
      process.env.REVENUE_CAT_API_KEY,
    // PostHog (analytics)
    // Recommended host values:
    // - US Cloud: https://us.i.posthog.com
    // - EU Cloud: https://eu.i.posthog.com
    posthogApiKey:
      process.env.POSTHOG_API_KEY ??
      process.env.EXPO_PUBLIC_POSTHOG_API_KEY ??
      process.env.POSTHOG_PROJECT_API_KEY,
    posthogHost:
      process.env.POSTHOG_HOST ??
      process.env.EXPO_PUBLIC_POSTHOG_HOST ??
      process.env.POSTHOG_API_HOST ??
      process.env.EXPO_PUBLIC_POSTHOG_API_HOST,
    // Control analytics behavior in dev/preview without changing code.
    // - POSTHOG_ENABLED=true  -> enable PostHog even outside production
    // - POSTHOG_DEBUG=true    -> enable verbose PostHog SDK logging in dev
    posthogEnabled:
      process.env.POSTHOG_ENABLED ??
      process.env.EXPO_PUBLIC_POSTHOG_ENABLED,
    posthogDebug:
      process.env.POSTHOG_DEBUG ??
      process.env.EXPO_PUBLIC_POSTHOG_DEBUG,
    // Public invite/referral landing domain (Vercel). Used for share links so
    // invites work even if the recipient hasn’t installed the app yet.
    inviteLandingBaseUrl:
      process.env.INVITE_LANDING_BASE_URL ??
      process.env.EXPO_PUBLIC_INVITE_LANDING_BASE_URL ??
      'https://go.kwilt.app',
    // Expose the resolved environment to the app runtime so we can distinguish
    // production installs from development/preview for things like demo data.
    environment: NODE_ENV,
  },
};

export default config;


