import type { ImageSourcePropType } from 'react-native';

// Centralized, explicit image sets to prevent cross-contamination between UX surfaces.
// Keep these in `src/` so static `require()` paths remain stable and typecheckable.

export const AUTH_WALLPAPER_BACKGROUNDS: readonly ImageSourcePropType[] = [
  // Deprecated: kept for backwards compatibility while we migrate auth wallpapers
  // to `src/assets/authSignInWallpapers.ts`.
  require('../assets/arc-banners/banner1.png'),
] as const;

export const ACTIVITY_FALLBACK_BANNERS: readonly ImageSourcePropType[] = [
  require('../assets/arc-banners/banner4.png'),
  require('../assets/arc-banners/banner1.png'),
  require('../assets/arc-banners/banner5.png'),
  require('../assets/arc-banners/banner7.png'),
  require('../assets/arc-banners/banner2.png'),
] as const;


