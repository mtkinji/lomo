import type { ImageSourcePropType } from 'react-native';

export type AuthSignInWallpaper = {
  id: string;
  source: ImageSourcePropType;
};

/**
 * Hand-picked wallpapers for the auth / sign-in interstitial.
 *
 * IMPORTANT:
 * - This set should remain **exclusive** to auth surfaces.
 * - Keep `id` stable if you ever want to persist selection later.
 */
export const AUTH_SIGNIN_WALLPAPERS: readonly AuthSignInWallpaper[] = [
  // NOTE: `id` values are derived from filenames (lowercased + hyphenated).
  // If you rename a file, update its `id` too if you ever persist selection.
  { id: 'jungle-river', source: require('../../assets/auth-wallpapers/jungle river.png') },
  { id: 'shinkansen', source: require('../../assets/auth-wallpapers/Shinkansen.png') },
  { id: 'bike-path', source: require('../../assets/auth-wallpapers/bike path.png') },
  { id: 'desert-camels', source: require('../../assets/auth-wallpapers/desert camels.png') },
  { id: 'angkor-wat', source: require('../../assets/auth-wallpapers/angkor wat.png') },
  { id: 'study-window', source: require('../../assets/auth-wallpapers/study window.png') },
  { id: 'canoeing', source: require('../../assets/auth-wallpapers/canoeing.png') },
  { id: 'hiking', source: require('../../assets/auth-wallpapers/hiking.png') },
  { id: 'island', source: require('../../assets/auth-wallpapers/island.png') },
  { id: 'japanese-lake', source: require('../../assets/auth-wallpapers/japanese lake.png') },
  { id: 'mountain-lake', source: require('../../assets/auth-wallpapers/mountain lake.png') },
  { id: 'night-train', source: require('../../assets/auth-wallpapers/night train.png') },
  { id: 'pacific-coast', source: require('../../assets/auth-wallpapers/pacific coast.png') },
  { id: 'rice-paddies', source: require('../../assets/auth-wallpapers/rice paddies.png') },
  { id: 'riverside-train', source: require('../../assets/auth-wallpapers/riverside train.png') },
  { id: 'sailing', source: require('../../assets/auth-wallpapers/sailing.png') },
  { id: 'sunset-highway', source: require('../../assets/auth-wallpapers/sunset highway.png') },
  { id: 'train', source: require('../../assets/auth-wallpapers/train.png') },
  { id: 'japan', source: require('../../assets/auth-wallpapers/Japan.png') },
] as const;


