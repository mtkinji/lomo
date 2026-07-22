import { radii } from '../theme';

export const CAPABILITY_SIDE_SHEET_WIDTH_RATIO = 0.8;
export const CAPABILITY_SIDE_SHEET_RADIUS = radii.deviceSheet;
export const CAPABILITY_SIDE_SHEET_DURATION_MS = 240;
export const CAPABILITY_SIDE_SHEET_FLING_VELOCITY = 600;
export const CAPABILITY_SIDE_SHEET_GESTURE_ACTIVATION_X = 8;
export const CAPABILITY_SIDE_SHEET_GESTURE_FAILURE_Y = 14;

export function resolveCapabilitySideSheetGestureActivation({
  menuOpen,
  reduceMotion,
  translationX,
  translationY,
}: {
  menuOpen: boolean;
  reduceMotion: boolean;
  translationX: number;
  translationY: number;
}): 'wait' | 'activate' | 'fail' {
  'worklet';
  if (!menuOpen || reduceMotion) return 'fail';
  if (Math.abs(translationY) > CAPABILITY_SIDE_SHEET_GESTURE_FAILURE_Y) return 'fail';
  if (Math.abs(translationX) > CAPABILITY_SIDE_SHEET_GESTURE_ACTIVATION_X) return 'activate';
  return 'wait';
}

export function getCapabilitySideSheetTranslation(viewportWidth: number, progress: number): number {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  return viewportWidth * CAPABILITY_SIDE_SHEET_WIDTH_RATIO * clampedProgress;
}

export function resolveCapabilitySideSheetSettle({
  progress,
  velocityX,
}: {
  progress: number;
  velocityX: number;
}): boolean {
  'worklet';
  if (velocityX >= CAPABILITY_SIDE_SHEET_FLING_VELOCITY) return true;
  if (velocityX <= -CAPABILITY_SIDE_SHEET_FLING_VELOCITY) return false;
  return progress >= 0.5;
}

export function getCapabilitySideSheetDuration(reduceMotion: boolean): number {
  return reduceMotion ? 0 : CAPABILITY_SIDE_SHEET_DURATION_MS;
}
