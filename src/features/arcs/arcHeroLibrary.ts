import type { FocusAreaId } from '../../domain/types';

export type ArcHeroEnergy = 'calm' | 'focused' | 'celebratory' | 'playful';
export type ArcHeroVibe = 'minimal' | 'textured' | 'abstract' | 'photo';
export type ArcHeroBrightness = 'light' | 'medium' | 'dark';

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
    id: 'health-sunrise-01',
    uri: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=1200&q=80',
    palette: ['#F97373', '#0F3C5D', '#FACC15'],
    tags: {
      focusAreas: ['health_energy'],
      energy: 'calm',
      timeHorizon: 'long_arc',
      vibe: 'photo',
      brightness: 'medium',
    },
  },
  {
    id: 'work-city-01',
    uri: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80',
    palette: ['#0F172A', '#38BDF8'],
    tags: {
      focusAreas: ['work_career'],
      energy: 'focused',
      timeHorizon: 'season',
      vibe: 'photo',
      brightness: 'dark',
    },
  },
  {
    id: 'learning-desk-01',
    uri: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
    palette: ['#F59E0B', '#0F172A'],
    tags: {
      focusAreas: ['learning_skills'],
      energy: 'focused',
      timeHorizon: 'season',
      vibe: 'photo',
      brightness: 'medium',
    },
  },
  {
    id: 'relationships-home-01',
    uri: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80',
    palette: ['#F472B6', '#F97316'],
    tags: {
      focusAreas: ['relationships_family'],
      energy: 'celebratory',
      timeHorizon: 'long_arc',
      vibe: 'photo',
      brightness: 'medium',
    },
  },
  {
    id: 'creactivity-studio-01',
    uri: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    palette: ['#22C55E', '#6366F1'],
    tags: {
      focusAreas: ['creativity_hobbies'],
      energy: 'playful',
      timeHorizon: 'season',
      vibe: 'photo',
      brightness: 'dark',
    },
  },
  {
    id: 'organizing-desk-01',
    uri: 'https://images.unsplash.com/photo-1504274066651-8d31a536b11a?auto=format&fit=crop&w=1200&q=80',
    palette: ['#0F3C5D', '#E5E7EB'],
    tags: {
      focusAreas: ['organizing_life'],
      energy: 'calm',
      timeHorizon: 'sprint',
      vibe: 'minimal',
      brightness: 'light',
    },
  },
];
