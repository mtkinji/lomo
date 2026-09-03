import { resolveRemoteGamesReleaseEnabled } from './remoteGamesReleasePolicy';

describe('remote Games submission release policy', () => {
  it('keeps anonymous remote play off in production even when an override is present', () => {
    expect(resolveRemoteGamesReleaseEnabled({ isDev: false, override: '1' })).toBe(false);
  });

  it('keeps the proving surface available only in development', () => {
    expect(resolveRemoteGamesReleaseEnabled({ isDev: true, override: '1' })).toBe(true);
    expect(resolveRemoteGamesReleaseEnabled({ isDev: true, override: undefined })).toBe(true);
  });
});
