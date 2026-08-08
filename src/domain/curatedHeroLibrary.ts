import { Image } from 'react-native';
import { AUTH_SIGNIN_WALLPAPERS } from '../assets/authSignInWallpapers';
import type { FocusAreaId } from './types';

export type ArcHeroEnergy = 'calm' | 'focused' | 'celebratory' | 'playful';
export type ArcHeroVibe = 'minimal' | 'textured' | 'abstract' | 'photo';
export type ArcHeroBrightness = 'light' | 'medium' | 'dark';

const resolveBundledUri = (assetModule: number): string => Image.resolveAssetSource(assetModule).uri;

export type ArcHeroImage = {
  id: string;
  /**
   * Canonical URI for the hero image. This can be a bundled static asset
   * (via require) or a remote URL.
   */
  uri: string;
  /**
   * Optional compact palette used for derived styling (for example, text
   * contrast decisions or theming accent chips).
   */
  palette?: string[];
  tags: {
    focusAreas?: FocusAreaId[];
    energy?: ArcHeroEnergy;
    timeHorizon?: 'sprint' | 'season' | 'long_arc';
    vibe?: ArcHeroVibe;
    brightness?: ArcHeroBrightness;
  };
};

const AUTH_WALLPAPER_HERO_METADATA: Partial<Record<
  string,
  Pick<ArcHeroImage, 'palette' | 'tags'>
>> = {
  'jungle-river': {
    palette: ['#0F3D2E', '#2F6F55', '#D9B56F'],
    tags: {
      focusAreas: ['health_energy', 'organizing_life'],
      energy: 'calm',
      timeHorizon: 'long_arc',
      vibe: 'photo',
      brightness: 'dark',
    },
  },
  shinkansen: {
    palette: ['#E5E7EB', '#1F2937', '#A7C7D9'],
    tags: {
      focusAreas: ['work_career', 'learning_skills'],
      energy: 'focused',
      timeHorizon: 'sprint',
      vibe: 'photo',
      brightness: 'medium',
    },
  },
  'bike-path': {
    palette: ['#6B8E52', '#D8C08A', '#1F2937'],
    tags: {
      focusAreas: ['health_energy'],
      energy: 'calm',
      timeHorizon: 'season',
      vibe: 'photo',
      brightness: 'medium',
    },
  },
  'desert-camels': {
    palette: ['#C08457', '#F3D8A6', '#4B5563'],
    tags: {
      focusAreas: ['organizing_life', 'relationships_family'],
      energy: 'calm',
      timeHorizon: 'long_arc',
      vibe: 'photo',
      brightness: 'medium',
    },
  },
  'angkor-wat': {
    palette: ['#475569', '#A16207', '#D6D3D1'],
    tags: {
      focusAreas: ['organizing_life', 'learning_skills'],
      energy: 'calm',
      timeHorizon: 'long_arc',
      vibe: 'photo',
      brightness: 'medium',
    },
  },
  'study-window': {
    palette: ['#1F2937', '#B08968', '#F5E6D3'],
    tags: {
      focusAreas: ['learning_skills', 'work_career'],
      energy: 'focused',
      timeHorizon: 'sprint',
      vibe: 'photo',
      brightness: 'medium',
    },
  },
  canoeing: {
    palette: ['#0F766E', '#7DD3FC', '#D97706'],
    tags: {
      focusAreas: ['health_energy', 'relationships_family'],
      energy: 'playful',
      timeHorizon: 'season',
      vibe: 'photo',
      brightness: 'medium',
    },
  },
  hiking: {
    palette: ['#14532D', '#84CC16', '#FDE68A'],
    tags: {
      focusAreas: ['health_energy'],
      energy: 'focused',
      timeHorizon: 'season',
      vibe: 'photo',
      brightness: 'medium',
    },
  },
  island: {
    palette: ['#0E7490', '#FDE68A', '#F97316'],
    tags: {
      focusAreas: ['health_energy', 'relationships_family'],
      energy: 'celebratory',
      timeHorizon: 'season',
      vibe: 'photo',
      brightness: 'light',
    },
  },
  'japanese-lake': {
    palette: ['#334155', '#93C5FD', '#F8FAFC'],
    tags: {
      focusAreas: ['organizing_life', 'health_energy'],
      energy: 'calm',
      timeHorizon: 'long_arc',
      vibe: 'photo',
      brightness: 'light',
    },
  },
  'night-train': {
    palette: ['#020617', '#F59E0B', '#64748B'],
    tags: {
      focusAreas: ['work_career', 'learning_skills'],
      energy: 'focused',
      timeHorizon: 'sprint',
      vibe: 'photo',
      brightness: 'dark',
    },
  },
  'pacific-coast': {
    palette: ['#0F766E', '#94A3B8', '#F8FAFC'],
    tags: {
      focusAreas: ['health_energy', 'organizing_life'],
      energy: 'calm',
      timeHorizon: 'long_arc',
      vibe: 'photo',
      brightness: 'medium',
    },
  },
  'rice-paddies': {
    palette: ['#166534', '#84CC16', '#EAB308'],
    tags: {
      focusAreas: ['health_energy', 'organizing_life'],
      energy: 'calm',
      timeHorizon: 'season',
      vibe: 'photo',
      brightness: 'medium',
    },
  },
  'riverside-train': {
    palette: ['#1E3A8A', '#64748B', '#FBBF24'],
    tags: {
      focusAreas: ['work_career', 'organizing_life'],
      energy: 'focused',
      timeHorizon: 'season',
      vibe: 'photo',
      brightness: 'medium',
    },
  },
  sailing: {
    palette: ['#075985', '#BAE6FD', '#F8FAFC'],
    tags: {
      focusAreas: ['health_energy', 'relationships_family'],
      energy: 'celebratory',
      timeHorizon: 'season',
      vibe: 'photo',
      brightness: 'light',
    },
  },
  'sunset-highway': {
    palette: ['#7C2D12', '#F97316', '#1F2937'],
    tags: {
      focusAreas: ['organizing_life', 'work_career'],
      energy: 'focused',
      timeHorizon: 'sprint',
      vibe: 'photo',
      brightness: 'dark',
    },
  },
};

const AUTH_WALLPAPER_HERO_LIBRARY: ArcHeroImage[] = AUTH_SIGNIN_WALLPAPERS.map((wallpaper) => {
  const metadata = AUTH_WALLPAPER_HERO_METADATA[wallpaper.id];
  return {
    id: `auth-wallpaper-${wallpaper.id}`,
    uri: resolveBundledUri(wallpaper.source),
    palette: metadata?.palette,
    tags: metadata?.tags ?? {
      energy: 'calm',
      timeHorizon: 'season',
      vibe: 'photo',
      brightness: 'medium',
    },
  };
});

/**
 * Lightweight, curated library of hero images.
 *
 * IMPORTANT: For persisted state, prefer storing `heroImageMeta.curatedId` and
 * re-resolving `uri` at runtime. Bundled asset URIs can change across builds.
 */
const CORE_ARC_HERO_LIBRARY: ArcHeroImage[] = [
  {
    id: 'arc-sandstone-waves-01',
    uri: resolveBundledUri(require('../assets/arc-banners/banner1.png')),
    palette: ['#F5D6A1', '#D08B4A', '#A8642A'],
    tags: {
      focusAreas: ['health_energy', 'organizing_life'],
      energy: 'calm',
      timeHorizon: 'long_arc',
      vibe: 'textured',
      brightness: 'medium',
    },
  },
  {
    id: 'arc-deep-graphite-01',
    uri: resolveBundledUri(require('../assets/arc-banners/banner2.png')),
    palette: ['#111827', '#4B5563'],
    tags: {
      focusAreas: ['work_career'],
      energy: 'focused',
      timeHorizon: 'sprint',
      vibe: 'minimal',
      brightness: 'dark',
    },
  },
  {
    id: 'arc-color-clouds-01',
    uri: resolveBundledUri(require('../assets/arc-banners/banner3.png')),
    palette: ['#F97316', '#16A34A', '#0EA5E9', '#6366F1'],
    tags: {
      focusAreas: ['learning_skills', 'creativity_hobbies'],
      energy: 'playful',
      timeHorizon: 'season',
      vibe: 'abstract',
      brightness: 'medium',
    },
  },
  {
    id: 'arc-vivid-palette-01',
    uri: resolveBundledUri(require('../assets/arc-banners/banner4.png')),
    palette: ['#EF4444', '#0EA5E9', '#FBBF24'],
    tags: {
      focusAreas: ['creativity_hobbies'],
      energy: 'celebratory',
      timeHorizon: 'season',
      vibe: 'textured',
      brightness: 'medium',
    },
  },
  {
    id: 'arc-earth-patchwork-01',
    uri: resolveBundledUri(require('../assets/arc-banners/banner5.png')),
    palette: ['#92400E', '#F59E0B', '#374151', '#6B7280'],
    tags: {
      focusAreas: ['organizing_life', 'work_career'],
      energy: 'focused',
      timeHorizon: 'long_arc',
      vibe: 'textured',
      brightness: 'medium',
    },
  },
  {
    id: 'arc-warm-fog-01',
    uri: resolveBundledUri(require('../assets/arc-banners/banner6.png')),
    palette: ['#F59E0B', '#F97316', '#1F2937'],
    tags: {
      focusAreas: ['relationships_family', 'health_energy'],
      energy: 'calm',
      timeHorizon: 'season',
      vibe: 'abstract',
      brightness: 'medium',
    },
  },
  {
    id: 'arc-midnight-tide-01',
    uri: resolveBundledUri(require('../assets/arc-banners/banner7.png')),
    palette: ['#0EA5E9', '#1D4ED8', '#020617'],
    tags: {
      focusAreas: ['health_energy'],
      energy: 'calm',
      timeHorizon: 'sprint',
      vibe: 'abstract',
      brightness: 'dark',
    },
  },
  {
    id: 'arc-golden-flow-01',
    uri: resolveBundledUri(require('../assets/arc-banners/banner8.png')),
    palette: ['#F97316', '#EA580C', '#FACC15'],
    tags: {
      focusAreas: ['creativity_hobbies'],
      energy: 'playful',
      timeHorizon: 'sprint',
      vibe: 'abstract',
      brightness: 'medium',
    },
  },
  {
    id: 'arc-dune-lines-01',
    uri: resolveBundledUri(require('../assets/arc-banners/banner 9.png')),
    palette: ['#F9FAFB', '#6B7280', '#111827'],
    tags: {
      focusAreas: ['organizing_life', 'work_career'],
      energy: 'calm',
      timeHorizon: 'long_arc',
      vibe: 'minimal',
      brightness: 'dark',
    },
  },
  {
    id: 'arc-signal-grid-01',
    uri: resolveBundledUri(require('../assets/arc-banners/banner10.png')),
    palette: ['#1D4ED8', '#0F172A', '#F97316'],
    tags: {
      focusAreas: ['work_career', 'learning_skills'],
      energy: 'focused',
      timeHorizon: 'season',
      vibe: 'abstract',
      brightness: 'dark',
    },
  },
  {
    id: 'arc-dual-gradient-01',
    uri: resolveBundledUri(require('../assets/arc-banners/banner11.png')),
    palette: ['#0EA5E9', '#1F2937', '#F97316'],
    tags: {
      focusAreas: ['learning_skills'],
      energy: 'focused',
      timeHorizon: 'sprint',
      vibe: 'abstract',
      brightness: 'medium',
    },
  },
  {
    id: 'arc-soft-spectrum-01',
    uri: resolveBundledUri(require('../assets/arc-banners/Banner12.png')),
    palette: ['#38BDF8', '#A855F7', '#EC4899', '#F9FAFB'],
    tags: {
      focusAreas: ['relationships_family', 'creativity_hobbies'],
      energy: 'celebratory',
      timeHorizon: 'long_arc',
      vibe: 'abstract',
      brightness: 'light',
    },
  },
];

export const ARC_HERO_LIBRARY: ArcHeroImage[] = [
  ...AUTH_WALLPAPER_HERO_LIBRARY,
  ...CORE_ARC_HERO_LIBRARY,
];

const ARC_HERO_BY_ID: Record<string, ArcHeroImage> = Object.fromEntries(
  ARC_HERO_LIBRARY.map((entry) => [entry.id, entry])
);

export function getArcHeroById(curatedId: string): ArcHeroImage | null {
  const key = typeof curatedId === 'string' ? curatedId.trim() : '';
  if (!key) return null;
  return ARC_HERO_BY_ID[key] ?? null;
}

export function getArcHeroUriById(curatedId: string): string | null {
  return getArcHeroById(curatedId)?.uri ?? null;
}


