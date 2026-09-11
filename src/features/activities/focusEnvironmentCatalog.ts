import type { ImageSourcePropType } from 'react-native';
import type { VideoSource } from 'expo-video';
import type { SoundscapeId } from '../../services/soundscapeCatalog';

const PUBLIC_FOCUS_ENVIRONMENT_ROOT =
  'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/focus_environment_assets/v1';
const canyonSpringVideoUri = __DEV__ && process.env.EXPO_PUBLIC_FOCUS_CANYON_SPRING_VIDEO_URL?.trim()
  ? process.env.EXPO_PUBLIC_FOCUS_CANYON_SPRING_VIDEO_URL.trim()
  : `${PUBLIC_FOCUS_ENVIRONMENT_ROOT}/focus/canyon-spring-stream-b0d1f2c83a2a.mp4`;

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
  video: require('../../../assets/videos/focus/mountain-overlook-loop-5c6b9596589d.mp4'),
};

export const CANYON_SPRING_ENVIRONMENT: FocusVideoEnvironment = {
  id: 'canyonSpring',
  title: 'Canyon Spring',
  poster: require('../../../assets/images/focus/canyon-spring-poster.jpg'),
  video: {
    uri: canyonSpringVideoUri,
    useCaching: true,
  },
};

export function focusVideoEnvironment(id: SoundscapeId): FocusVideoEnvironment | null {
  if (id === CANYON_SPRING_ENVIRONMENT.id) return CANYON_SPRING_ENVIRONMENT;
  if (id === MOUNTAIN_OVERLOOK_ENVIRONMENT.id) return MOUNTAIN_OVERLOOK_ENVIRONMENT;
  return null;
}
