import { resolveAppEnvironment } from './appEnvironment';

describe('resolveAppEnvironment', () => {
  it('treats EAS production profiles as production even when NODE_ENV is development', () => {
    expect(
      resolveAppEnvironment({
        EAS_BUILD_PROFILE: 'production',
        NODE_ENV: 'development',
      }),
    ).toBe('production');

    expect(
      resolveAppEnvironment({
        EAS_BUILD_PROFILE: 'production-widgets',
        NODE_ENV: 'development',
      }),
    ).toBe('production');
  });

  it('uses explicit Kwilt app env before build profile inference', () => {
    expect(
      resolveAppEnvironment({
        KWILT_APP_ENV: 'production',
        EAS_BUILD_PROFILE: 'development',
        NODE_ENV: 'development',
      }),
    ).toBe('production');
  });

  it('keeps preview and local development distinct', () => {
    expect(resolveAppEnvironment({ EAS_BUILD_PROFILE: 'preview-widgets' })).toBe('preview');
    expect(resolveAppEnvironment({ NODE_ENV: 'development' })).toBe('development');
  });

  it('rejects invalid explicit Kwilt app environments instead of silently disabling analytics', () => {
    expect(() => resolveAppEnvironment({ KWILT_APP_ENV: 'prod' })).toThrow(
      'Unsupported KWILT_APP_ENV',
    );
  });
});
