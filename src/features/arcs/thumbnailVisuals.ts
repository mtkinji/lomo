import type { ThumbnailStyle } from '../../domain/types';

type ArcGradientPalette = [string, string, ...string[]];

export type ArcGradientDirection = {
  start: { x: number; y: number };
  end: { x: number; y: number };
};

export const ARC_THUMBNAIL_PALETTES: ArcGradientPalette[] = [
  ['#FF5F6D', '#FFC371'],
  ['#FF007A', '#C026D3', '#7C3AED'],
  ['#00C6FF', '#00A2FF', '#2563EB'],
  ['#34D399', '#10B981', '#0EA5E9'],
  ['#F59E0B', '#F97316', '#DC2626'],
  ['#2DD4BF', '#14B8A6', '#2563EB'],
  ['#F472B6', '#DB2777', '#8B5CF6'],
  ['#FDE047', '#F97316', '#C026D3'],
  ['#FB7185', '#F43F5E', '#A21CAF'],
  ['#0EA5E9', '#2563EB', '#312E81'],
  ['#A7F3D0', '#34D399', '#059669'],
  ['#38BDF8', '#6366F1', '#A855F7'],
  ['#FDBA74', '#FACC15', '#22C55E'],
  ['#1D4ED8', '#1E3A8A', '#0F172A'],
  ['#FFE259', '#FFA751', '#FF5E62'],
  ['#FF7EB3', '#FF2D95', '#8E24AA'],
] as const;

export const ARC_THUMBNAIL_DIRECTIONS: ArcGradientDirection[] = [
  { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  { start: { x: 0, y: 1 }, end: { x: 1, y: 0 } },
  { start: { x: 0.1, y: 0 }, end: { x: 1, y: 0.8 } },
  { start: { x: 0, y: 0.2 }, end: { x: 0.9, y: 1 } },
  { start: { x: 0.2, y: 0 }, end: { x: 0.8, y: 1 } },
  { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } },
  { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } },
  { start: { x: 0.1, y: 0.9 }, end: { x: 0.9, y: 0.1 } },
];

export const ARC_TOPO_GRID_SIZE = 6;
const ARC_TOPO_CELL_COUNT = ARC_TOPO_GRID_SIZE * ARC_TOPO_GRID_SIZE;

export const ARC_MOSAIC_ROWS = 3;
export const ARC_MOSAIC_COLS = 4;
const ARC_MOSAIC_COLORS = ['#F97373', '#0F3C5D', '#FACC15', '#F9E2AF', '#E5E7EB'];

export type ArcMosaicCell = {
  shape: 0 | 1 | 2 | 3; // 0=empty,1=circle,2=vertical pill,3=horizontal pill
  color: string;
};

export const DEFAULT_THUMBNAIL_STYLE: ThumbnailStyle = 'topographyDots';

export const hashStringToIndex = (value: string, modulo: number): number => {
  if (modulo <= 0) {
    return 0;
  }
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  const normalized = Math.abs(hash);
  return normalized % modulo;
};

export const getArcGradient = (seed: string) => {
  const colors = ARC_THUMBNAIL_PALETTES[hashStringToIndex(seed, ARC_THUMBNAIL_PALETTES.length)];
  const direction =
    ARC_THUMBNAIL_DIRECTIONS[
      hashStringToIndex(`${seed}:dir`, ARC_THUMBNAIL_DIRECTIONS.length)
    ];
  return { colors, direction };
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const seededFloat = (seed: string, key: string, modulo = 10_000) => {
  if (modulo <= 0) {
    return 0;
  }
  return hashStringToIndex(`${seed}:${key}`, modulo) / modulo;
};

export const getArcTopoSizes = (seed: string): number[] => {
  const effectiveSeed = seed && seed.length > 0 ? seed : 'arc-topography';

  const centerJitter = 0.18;
  const centerX = 0.5 + (seededFloat(effectiveSeed, 'centerX') - 0.5) * 2 * centerJitter;
  const centerY = 0.5 + (seededFloat(effectiveSeed, 'centerY') - 0.5) * 2 * centerJitter;
  const rotation = (seededFloat(effectiveSeed, 'rotation') - 0.5) * (Math.PI / 1.2);
  const eccentricity = 0.7 + seededFloat(effectiveSeed, 'eccentricity') * 0.6;
  const ridgeDensity = 2.6 + seededFloat(effectiveSeed, 'density') * 1.6;
  const ridgeOffset = seededFloat(effectiveSeed, 'offset');
  const wobbleAmount = 0.05 + seededFloat(effectiveSeed, 'wobble') * 0.08;
  const noiseAmplitude = 0.15 + seededFloat(effectiveSeed, 'noise') * 0.12;

  const cosTheta = Math.cos(rotation);
  const sinTheta = Math.sin(rotation);

  const sizes: number[] = [];

  for (let row = 0; row < ARC_TOPO_GRID_SIZE; row += 1) {
    for (let col = 0; col < ARC_TOPO_GRID_SIZE; col += 1) {
      const u = (col + 0.5) / ARC_TOPO_GRID_SIZE;
      const v = (row + 0.5) / ARC_TOPO_GRID_SIZE;

      const dx = u - centerX;
      const dy = v - centerY;

      const rotatedX = dx * cosTheta - dy * sinTheta;
      const rotatedY = dx * sinTheta + dy * cosTheta;

      const stretchedY = rotatedY / eccentricity;
      const radius = Math.sqrt(rotatedX * rotatedX + stretchedY * stretchedY);

      const wobble =
        (seededFloat(effectiveSeed, `w:${row}:${col}`) - 0.5) * 2 * wobbleAmount;
      const warpedRadius = Math.max(0, radius + wobble);

      const ringValue =
        Math.cos((warpedRadius * ridgeDensity + ridgeOffset) * Math.PI * 2);
      const normalized = (ringValue + 1) / 2;

      const noise =
        (seededFloat(effectiveSeed, `n:${row}:${col}`) - 0.5) * 2 * noiseAmplitude;
      const elevation = clamp(normalized + noise, 0, 1);

      let size = -1;
      if (elevation > 0.75) {
        size = 2;
      } else if (elevation > 0.55) {
        size = 1;
      } else if (elevation > 0.35) {
        size = 0;
      }

      sizes.push(size);
    }
  }

  return sizes;
};

export const getArcMosaicCell = (seed: string, row: number, col: number): ArcMosaicCell => {
  const base = hashStringToIndex(`${seed}:${row}:${col}`, 1024);
  const shape = (base % 4) as ArcMosaicCell['shape'];
  const colorIndex = (base >> 2) % ARC_MOSAIC_COLORS.length;
  return { shape, color: ARC_MOSAIC_COLORS[colorIndex] };
};

export const pickThumbnailStyle = (
  seed: string,
  styles?: ThumbnailStyle[]
): ThumbnailStyle => {
  if (!styles || styles.length === 0) {
    return DEFAULT_THUMBNAIL_STYLE;
  }
  const index = hashStringToIndex(seed, styles.length);
  return styles[index] ?? DEFAULT_THUMBNAIL_STYLE;
};

export const buildArcThumbnailSeed = (
  arcId?: string | null,
  arcName?: string | null,
  variant?: number | null
): string => {
  const base = arcId || arcName || 'arc';
  if (typeof variant === 'number' && variant > 0) {
    return `${base}:variant:${variant}`;
  }
  return base;
};

