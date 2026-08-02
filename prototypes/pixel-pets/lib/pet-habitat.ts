export interface HabitatImageLayer {
  src: string;
  size: { width: number; height: number };
}

export interface HabitatBackdropLayer extends HabitatImageLayer {
  parallax: number;
}

export interface HabitatAnchoredLayer extends HabitatImageLayer {
  anchor: { x: number; y: number };
}

export interface HabitatForegroundLayer extends HabitatImageLayer {
  baseline: number;
}

export interface PetHabitatManifest {
  backdrop: HabitatBackdropLayer;
  shelterTree: HabitatAnchoredLayer;
  foreground: HabitatForegroundLayer;
  weatherBakedIn: false;
}

export const LEAFLING_HABITAT: PetHabitatManifest = {
  backdrop: {
    src: "/leafling-habitat-backdrop-v1.png",
    size: { width: 480, height: 240 },
    parallax: 0.85,
  },
  shelterTree: {
    src: "/leafling-shelter-tree-v1.png",
    size: { width: 176, height: 196 },
    anchor: { x: 88, y: 196 },
  },
  foreground: {
    src: "/leafling-meadow-foreground-v1.png",
    size: { width: 480, height: 64 },
    baseline: 8,
  },
  weatherBakedIn: false,
};

export function resolveHabitatBackdropX(cameraX: number, viewportWidth: number) {
  const backdrop = LEAFLING_HABITAT.backdrop;
  const parallaxX = -(cameraX - viewportWidth / 2) * backdrop.parallax;
  return Math.min(0, Math.max(viewportWidth - backdrop.size.width, parallaxX));
}
