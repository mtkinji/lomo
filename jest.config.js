module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/?(*.)+(test).[tj]s?(x)'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // We use TS path aliases like @/...
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};


