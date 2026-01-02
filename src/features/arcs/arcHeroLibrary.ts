import { Image } from 'react-native';
import type { FocusAreaId } from '../../domain/types';

export type ArcHeroEnergy = 'calm' | 'focused' | 'celebratory' | 'playful';
export type ArcHeroVibe = 'minimal' | 'textured' | 'abstract' | 'photo';
export type ArcHeroBrightness = 'light' | 'medium' | 'dark';

const resolveBundledUri = (assetModule: number): string =>
  Image.resolveAssetSource(assetModule).uri;

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

/**
 * Lightweight, curated library of Arc hero images.
 *
 * These URIs are intentionally generic placeholders; hosts can swap them for
 * bundled static assets or brand-safe image URLs without changing call sites.
 */
export const ARC_HERO_LIBRARY: ArcHeroImage[] = [
  {
    id: 'arc-sandstone-waves-01',
    uri: resolveBundledUri(require('../../assets/arc-banners/banner1.png')),
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
    uri: resolveBundledUri(require('../../assets/arc-banners/banner2.png')),
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
    uri: resolveBundledUri(require('../../assets/arc-banners/banner3.png')),
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
    uri: resolveBundledUri(require('../../assets/arc-banners/banner4.png')),
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
    uri: resolveBundledUri(require('../../assets/arc-banners/banner5.png')),
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
    uri: resolveBundledUri(require('../../assets/arc-banners/banner6.png')),
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
    uri: resolveBundledUri(require('../../assets/arc-banners/banner7.png')),
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
    uri: resolveBundledUri(require('../../assets/arc-banners/banner8.png')),
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
    uri: resolveBundledUri(require('../../assets/arc-banners/banner 9.png')),
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
    uri: resolveBundledUri(require('../../assets/arc-banners/banner10.png')),
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
    uri: resolveBundledUri(require('../../assets/arc-banners/banner11.png')),
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
    uri: resolveBundledUri(require('../../assets/arc-banners/Banner12.png')),
    palette: ['#38BDF8', '#A855F7', '#EC4899', '#F9FAFB'],
    tags: {
      focusAreas: ['relationships_family', 'creativity_hobbies'],
      energy: 'celebratory',
      timeHorizon: 'long_arc',
      vibe: 'abstract',
      brightness: 'light',
    },
  },
  {
    id: 'arc-asset-image-01',
    uri: resolveBundledUri(require('../../assets/arc-banners/image.png')),
    tags: {},
  },
  {
    id: 'arc-asset-image-04',
    uri: resolveBundledUri(require('../../assets/arc-banners/image4.png')),
    tags: {},
  },
  {
    id: 'arc-asset-image-copy-01',
    uri: resolveBundledUri(require('../../assets/arc-banners/image copy.png')),
    tags: {},
  },
  {
    id: 'arc-asset-image-copy-02',
    uri: resolveBundledUri(require('../../assets/arc-banners/image copy 2.png')),
    tags: {},
  },
  {
    id: 'arc-asset-image-copy-03',
    uri: resolveBundledUri(require('../../assets/arc-banners/image copy 3.png')),
    tags: {},
  },
  {
    id: 'arc-asset-image-copy-04',
    uri: resolveBundledUri(require('../../assets/arc-banners/image copy 4.png')),
    tags: {},
  },
  {
    id: 'arc-asset-image-copy-05',
    uri: resolveBundledUri(require('../../assets/arc-banners/image copy 5.png')),
    tags: {},
  },
  {
    id: 'arc-asset-image-copy-06',
    uri: resolveBundledUri(require('../../assets/arc-banners/image copy 6.png')),
    tags: {},
  },
  {
    id: 'arc-asset-image-copy-07',
    uri: resolveBundledUri(require('../../assets/arc-banners/image copy 7.png')),
    tags: {},
  },
  {
    id: 'arc-asset-image-copy-08',
    uri: resolveBundledUri(require('../../assets/arc-banners/image copy 8.png')),
    tags: {},
  },
  {
    id: 'arc-asset-image-copy-09',
    uri: resolveBundledUri(require('../../assets/arc-banners/image copy 9.png')),
    tags: {},
  },
  {
    id: 'arc-asset-image-copy-10',
    uri: resolveBundledUri(require('../../assets/arc-banners/image copy 10.png')),
    tags: {},
  },
];
