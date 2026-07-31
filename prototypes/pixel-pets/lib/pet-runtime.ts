export interface AtlasCell {
  column: number;
  row: number;
}

export interface PetFrameTransform {
  x: number;
  y: number;
}

export interface PetAnimationFrame {
  cell: AtlasCell;
  duration: number;
  events?: string[];
  transform?: PetFrameTransform;
}

export interface PetAnimationClip {
  loop: boolean;
  frames: PetAnimationFrame[];
}

export interface PetAnimationManifest {
  atlas: {
    src: string;
    frameWidth: number;
    frameHeight: number;
    columns: number;
    rows: number;
  };
  fallbackClip: string;
  clips: Record<string, PetAnimationClip>;
}

export interface PetFrameSnapshot {
  clip: string;
  frameIndex: number;
  frameCount: number;
  cell: AtlasCell;
  progress: number;
  completed: boolean;
  events: string[];
  transform: PetFrameTransform;
}

const REST_TRANSFORM: PetFrameTransform = { x: 0, y: 0 };

export function clipDuration(clip: PetAnimationClip): number {
  return clip.frames.reduce((sum, frame) => sum + frame.duration, 0);
}

export function resolvePetFrame(
  manifest: PetAnimationManifest,
  requestedClip: string,
  elapsedMs: number,
  reducedMotion: boolean,
): PetFrameSnapshot {
  const hasRequestedClip = Object.hasOwn(manifest.clips, requestedClip);
  const clipId = hasRequestedClip ? requestedClip : manifest.fallbackClip;
  const clip = manifest.clips[clipId];

  if (!clip || clip.frames.length === 0) {
    throw new Error(`Pet animation clip "${clipId}" has no frames.`);
  }

  const total = clipDuration(clip);
  if (total <= 0) {
    throw new Error(`Pet animation clip "${clipId}" has no positive duration.`);
  }

  const safeElapsed = Math.max(0, elapsedMs);
  const completed = !clip.loop && safeElapsed >= total;
  const playhead = clip.loop
    ? safeElapsed % total
    : Math.min(safeElapsed, total - 1);

  let frameIndex = 0;
  let cursor = 0;
  for (let index = 0; index < clip.frames.length; index += 1) {
    cursor += clip.frames[index].duration;
    if (playhead < cursor) {
      frameIndex = index;
      break;
    }
  }

  const frame = clip.frames[frameIndex];
  return {
    clip: clipId,
    frameIndex,
    frameCount: clip.frames.length,
    cell: frame.cell,
    progress: playhead / total,
    completed,
    events: frame.events ?? [],
    transform: reducedMotion ? REST_TRANSFORM : (frame.transform ?? REST_TRANSFORM),
  };
}
