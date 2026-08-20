const HORIZONTAL_ACTIVATION_DISTANCE = 12;
const PAGE_DISTANCE_RATIO = 0.18;
const PAGE_VELOCITY = 0.65;

export function shouldCaptureHorizontalPagerGesture(dx: number, dy: number): boolean {
  return (
    Math.abs(dx) >= HORIZONTAL_ACTIVATION_DISTANCE &&
    Math.abs(dx) > Math.abs(dy) * 1.15
  );
}

export function shouldEnableVerticalOnboardingScroll(fontScale: number): boolean {
  return fontScale >= 1.3;
}

export function resolveCapabilityPagerRelease({
  index,
  pageCount,
  width,
  dx,
  velocityX,
}: {
  index: number;
  pageCount: number;
  width: number;
  dx: number;
  velocityX: number;
}): { kind: 'page'; index: number } | { kind: 'explore' } {
  const validPageCount = Math.max(1, pageCount);
  const currentIndex = Math.max(0, Math.min(validPageCount - 1, index));
  const crossedDistance = Math.abs(dx) >= Math.max(1, width) * PAGE_DISTANCE_RATIO;
  const crossedVelocity = Math.abs(velocityX) >= PAGE_VELOCITY;
  if (!crossedDistance && !crossedVelocity) {
    return { kind: 'page', index: currentIndex };
  }

  const movingForward = dx < 0 || (dx === 0 && velocityX < 0);
  if (movingForward && currentIndex === validPageCount - 1) {
    return { kind: 'explore' };
  }

  const nextIndex = currentIndex + (movingForward ? 1 : -1);
  return {
    kind: 'page',
    index: Math.max(0, Math.min(validPageCount - 1, nextIndex)),
  };
}
