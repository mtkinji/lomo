import {
  resolveCapabilityPagerRelease,
  shouldCaptureHorizontalPagerGesture,
  shouldEnableVerticalOnboardingScroll,
} from './capabilityOnboardingPagerModel';

describe('capability onboarding pager decisions', () => {
  it('leaves one horizontal gesture owner at ordinary text sizes', () => {
    expect(shouldEnableVerticalOnboardingScroll(1)).toBe(false);
    expect(shouldEnableVerticalOnboardingScroll(1.29)).toBe(false);
    expect(shouldEnableVerticalOnboardingScroll(1.3)).toBe(true);
  });

  it('captures deliberate horizontal movement but leaves vertical reading alone', () => {
    expect(shouldCaptureHorizontalPagerGesture(13, 2)).toBe(true);
    expect(shouldCaptureHorizontalPagerGesture(-20, 5)).toBe(true);
    expect(shouldCaptureHorizontalPagerGesture(8, 1)).toBe(false);
    expect(shouldCaptureHorizontalPagerGesture(16, 20)).toBe(false);
  });

  it('returns short slow drags to the current page', () => {
    expect(resolveCapabilityPagerRelease({
      index: 2,
      pageCount: 5,
      width: 400,
      dx: -40,
      velocityX: -0.2,
    })).toEqual({ kind: 'page', index: 2 });
  });

  it('uses distance or velocity to page in either direction', () => {
    expect(resolveCapabilityPagerRelease({
      index: 2,
      pageCount: 5,
      width: 400,
      dx: -80,
      velocityX: -0.2,
    })).toEqual({ kind: 'page', index: 3 });
    expect(resolveCapabilityPagerRelease({
      index: 2,
      pageCount: 5,
      width: 400,
      dx: 20,
      velocityX: 0.7,
    })).toEqual({ kind: 'page', index: 1 });
  });

  it('clamps a backward swipe on Welcome', () => {
    expect(resolveCapabilityPagerRelease({
      index: 0,
      pageCount: 5,
      width: 400,
      dx: 100,
      velocityX: 0.8,
    })).toEqual({ kind: 'page', index: 0 });
  });

  it('explores Kwilt after a forward swipe from the final door', () => {
    expect(resolveCapabilityPagerRelease({
      index: 4,
      pageCount: 5,
      width: 400,
      dx: -80,
      velocityX: -0.2,
    })).toEqual({ kind: 'explore' });
  });
});
