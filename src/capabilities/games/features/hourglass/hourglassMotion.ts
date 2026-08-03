export type HourglassEnd = 'upright' | 'inverted';

export const PHYSICAL_END_STABLE_MS = 320;
const END_GRAVITY_THRESHOLD = 6.2;

export type PhysicalFlipState = {
  armedEnd: HourglassEnd | null;
  candidateEnd: HourglassEnd | null;
  candidateSinceMs: number | null;
};

export function createPhysicalFlipState(): PhysicalFlipState {
  return { armedEnd: null, candidateEnd: null, candidateSinceMs: null };
}

export function classifyHourglassEnd(gravityY: number): HourglassEnd | null {
  if (gravityY <= -END_GRAVITY_THRESHOLD) return 'upright';
  if (gravityY >= END_GRAVITY_THRESHOLD) return 'inverted';
  return null;
}

export function advancePhysicalFlip(
  state: PhysicalFlipState,
  gravityY: number,
  nowMs: number,
): { state: PhysicalFlipState; flippedTo: HourglassEnd | null } {
  const end = classifyHourglassEnd(gravityY);
  if (end === null) {
    return {
      state: { ...state, candidateEnd: null, candidateSinceMs: null },
      flippedTo: null,
    };
  }

  if (end !== state.candidateEnd || state.candidateSinceMs === null) {
    return {
      state: { ...state, candidateEnd: end, candidateSinceMs: nowMs },
      flippedTo: null,
    };
  }

  if (nowMs - state.candidateSinceMs < PHYSICAL_END_STABLE_MS) {
    return { state, flippedTo: null };
  }

  if (state.armedEnd === null) {
    return {
      state: { armedEnd: end, candidateEnd: end, candidateSinceMs: state.candidateSinceMs },
      flippedTo: null,
    };
  }

  if (end !== state.armedEnd) {
    return {
      state: { armedEnd: end, candidateEnd: end, candidateSinceMs: state.candidateSinceMs },
      flippedTo: end,
    };
  }

  return { state, flippedTo: null };
}
