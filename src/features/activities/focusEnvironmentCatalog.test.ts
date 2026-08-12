import { CANYON_SPRING_ENVIRONMENT, focusVideoEnvironment } from './focusEnvironmentCatalog';

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
    expect(focusVideoEnvironment('quietRain')).toBeNull();
    expect(focusVideoEnvironment('default')).toBeNull();
  });
});
