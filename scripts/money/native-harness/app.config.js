// Deliberately independent of the real app config and its credentials/startup.
module.exports = { expo: {
  name: 'Budget native fixture', slug: 'kwilt', scheme: 'exp+kwilt',
  version: '1.0.0', platforms: ['ios'],
  ios: { bundleIdentifier: 'com.andrewwatanabe.kwilt.budgetfixture' },
} };
