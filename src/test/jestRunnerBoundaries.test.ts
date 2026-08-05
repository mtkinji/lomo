const jestConfig = require('../../jest.config.js') as {
  testPathIgnorePatterns: string[];
};
const pixelPetsPackage = require('../../prototypes/pixel-pets/package.json') as {
  scripts: { test: string };
};

describe('Jest runner boundaries', () => {
  it('leaves Pixel Pets tests to their declared Node runner', () => {
    expect(pixelPetsPackage.scripts.test).toMatch(/node --test/);
    expect(jestConfig.testPathIgnorePatterns).toContain('<rootDir>/prototypes/pixel-pets/');
  });
});
