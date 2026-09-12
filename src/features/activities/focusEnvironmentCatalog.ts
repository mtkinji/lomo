import type { ImageSourcePropType } from 'react-native';
import type { VideoSource } from 'expo-video';
import type { SoundscapeId } from '../../services/soundscapeCatalog';

const PUBLIC_FOCUS_ENVIRONMENT_ROOT =
  'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/focus_environment_assets/v1';

function focusVideoSource(assetName: string): VideoSource {
  return {
    uri: `${PUBLIC_FOCUS_ENVIRONMENT_ROOT}/focus/${assetName}`,
    useCaching: true,
  };
}

export type FocusVideoEnvironment = {
  id: Extract<SoundscapeId, 'canyonSpring' | 'mountainOverlook'>;
  title: string;
  poster: ImageSourcePropType;
  video: VideoSource;
};

export const MOUNTAIN_OVERLOOK_ENVIRONMENT: FocusVideoEnvironment = {
  id: 'mountainOverlook',
  title: 'Mountain Overlook',
  poster: require('../../../assets/images/focus/mountain-overlook-poster.jpg'),
  video: focusVideoSource('mountain-overlook-loop-5c6b9596589d.mp4'),
};

export const CANYON_SPRING_ENVIRONMENT: FocusVideoEnvironment = {
  id: 'canyonSpring',
  title: 'Canyon Spring',
  poster: require('../../../assets/images/focus/canyon-spring-poster.jpg'),
  video: focusVideoSource('canyon-spring-stream-b0d1f2c83a2a.mp4'),
};

export const FOCUS_VIDEO_ENVIRONMENTS: readonly FocusVideoEnvironment[] = [
  CANYON_SPRING_ENVIRONMENT,
  MOUNTAIN_OVERLOOK_ENVIRONMENT,
];

export function focusVideoEnvironment(id: SoundscapeId): FocusVideoEnvironment | null {
  return FOCUS_VIDEO_ENVIRONMENTS.find((environment) => environment.id === id) ?? null;
}
