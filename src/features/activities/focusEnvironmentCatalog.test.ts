import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  CANYON_SPRING_ENVIRONMENT,
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

  it('bundles the Mountain Overlook loop with its local poster', () => {
    expect(MOUNTAIN_OVERLOOK_ENVIRONMENT).toMatchObject({
      id: 'mountainOverlook',
      title: 'Mountain Overlook',
    });
    const catalogSource = readFileSync(path.join(__dirname, 'focusEnvironmentCatalog.ts'), 'utf8');
    expect(catalogSource).toContain("require('../../../assets/videos/focus/mountain-overlook-loop-5c6b9596589d.mp4')");
    expect(catalogSource).not.toContain('focus/mountain-overlook-loop-5c6b9596589d.mp4`');
    expect(MOUNTAIN_OVERLOOK_ENVIRONMENT.video).toBeTruthy();
    expect(MOUNTAIN_OVERLOOK_ENVIRONMENT.poster).toBeTruthy();
  });
});
