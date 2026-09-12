import {
  CANYON_SPRING_ENVIRONMENT,
  FOCUS_VIDEO_ENVIRONMENTS,
  MOUNTAIN_OVERLOOK_ENVIRONMENT,
  focusVideoEnvironment,
} from './focusEnvironmentCatalog';

describe('Focus environment catalog', () => {
  it('keeps the prototype stream behind the permanent Canyon Spring identity', () => {
    expect(CANYON_SPRING_ENVIRONMENT).toMatchObject({
      id: 'canyonSpring',
      title: 'Canyon Spring',
      video: {
        uri: expect.stringContaining(
          '/focus_environment_assets/v1/focus/canyon-spring-stream-b0d1f2c83a2a.mp4',
        ),
        useCaching: true,
      },
    });
    expect(CANYON_SPRING_ENVIRONMENT.poster).toBeTruthy();
  });

  it('returns video ownership only for a video-backed environment', () => {
    expect(focusVideoEnvironment('canyonSpring')).toBe(CANYON_SPRING_ENVIRONMENT);
    expect(focusVideoEnvironment('mountainOverlook')).toBe(MOUNTAIN_OVERLOOK_ENVIRONMENT);
    expect(focusVideoEnvironment('quietRain')).toBeNull();
    expect(focusVideoEnvironment('default')).toBeNull();
  });

  it('serves every Focus video from a versioned public CDN path with local caching', () => {
    for (const environment of FOCUS_VIDEO_ENVIRONMENTS) {
      expect(environment.video).toEqual({
        uri: expect.stringMatching(
          /^https:\/\/sqxwjtorodqjdfnuvprf\.supabase\.co\/storage\/v1\/object\/public\/focus_environment_assets\/v\d+\/focus\/[a-z0-9-]+-[a-f0-9]{12}\.mp4$/,
        ),
        useCaching: true,
      });
      expect(environment.poster).toBeTruthy();
    }
  });
});
