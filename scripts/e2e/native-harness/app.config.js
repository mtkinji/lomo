// Standalone test project: never loads the application's dotenv cascade.
const mode = process.env.KWILT_MAESTRO_APP_FIXTURE;
if (!['auth', 'workspace'].includes(mode)) throw new Error('Explicit native fixture mode required');
module.exports = { expo: {
  name: 'Kwilt native smoke fixture', slug: 'kwilt', scheme: 'exp+kwilt',
  version: '1.0.0', platforms: ['ios'],
  ios: { bundleIdentifier: 'com.andrewwatanabe.kwilt.smokefixture' },
  extra: {
    nativeSmokeMode: mode,
    supabaseUrl: 'http://127.0.0.1:55439',
    supabasePublishableKey: 'sb_publishable_native_smoke_not_a_real_key',
  },
} };
