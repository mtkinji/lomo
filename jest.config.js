module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/?(*.)+(test).[tj]s?(x)'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // We use TS path aliases like @/...
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Allow Babel to transform a few extra ESM packages used by RN component
  // surfaces. The default jest-expo allow-list omits these but they ship
  // untranspiled JSX / ESM that breaks parsing in component tests.
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|@rn-primitives|@gorhom))',
    '/node_modules/react-native-reanimated/plugin/',
  ],
  collectCoverageFrom: [
    '<rootDir>/src/domain/**/*.{ts,tsx}',
    '<rootDir>/src/services/**/*.{ts,tsx}',
    '<rootDir>/src/store/**/*.{ts,tsx}',
    '<rootDir>/src/utils/**/*.{ts,tsx}',
    // Layer 2 test surfaces. We intentionally measure coverage here so feature
    // tests pull weight in the global thresholds; the ignore list below
    // deliberately excludes large screens that aren't yet under test (and
    // would otherwise dominate the denominator).
    '<rootDir>/src/features/**/*.{ts,tsx}',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/ui/',
    '<rootDir>/src/navigation/',
    '<rootDir>/src/assets/',
    '<rootDir>/src/theme/',
    '<rootDir>/src/types/',
    '\\.d\\.ts$',
    // Feature surfaces with significant native/UI surface area that aren't yet
    // covered by Layer 2 tests. These can be moved out of the ignore list as
    // their tests land.
    '<rootDir>/src/features/ai/',
    '<rootDir>/src/features/onboarding/',
    '<rootDir>/src/features/arcs/ArcDetailScreen.tsx',
    '<rootDir>/src/features/arcs/ArcsScreen.tsx',
    '<rootDir>/src/features/arcs/ArcCreationFlow.tsx',
    '<rootDir>/src/features/arcs/ArcBannerSheet.tsx',
    '<rootDir>/src/features/arcs/ArcDraftContinueFlow.tsx',
    '<rootDir>/src/features/activities/',
    '<rootDir>/src/features/account/',
    '<rootDir>/src/features/chapters/',
    '<rootDir>/src/features/today/',
    '<rootDir>/src/features/dev/',
    '<rootDir>/src/features/devtools/',
    '<rootDir>/src/features/notifications/',
    '<rootDir>/src/features/journey/',
    '<rootDir>/src/features/share/',
  ],
  coverageReporters: ['text', 'text-summary', 'lcov'],
  // Thresholds re-baselined after Phases 1-4 land. They reflect *measured*
  // coverage with a small buffer so day-to-day churn doesn't break CI; raise
  // these as new tests land so the suite continues to pull weight.
  // Last measured (May 2026): statements 16.01 / branches 12.72 / functions
  // 15.22 / lines 16.81.
  coverageThreshold: {
    global: {
      branches: 12,
      functions: 14,
      lines: 16,
      statements: 15,
    },
  },
};


