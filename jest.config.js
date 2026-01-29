module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/?(*.)+(test).[tj]s?(x)'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // We use TS path aliases like @/...
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    '<rootDir>/src/domain/**/*.{ts,tsx}',
    '<rootDir>/src/services/**/*.{ts,tsx}',
    '<rootDir>/src/store/**/*.{ts,tsx}',
    '<rootDir>/src/utils/**/*.{ts,tsx}',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/ui/',
    '<rootDir>/src/features/',
    '<rootDir>/src/navigation/',
    '<rootDir>/src/assets/',
    '<rootDir>/src/theme/',
    '<rootDir>/src/types/',
    '\\.d\\.ts$',
  ],
  coverageReporters: ['text', 'text-summary', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 15,
      lines: 20,
      statements: 20,
    },
  },
};


