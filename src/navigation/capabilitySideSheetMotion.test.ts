import {
  CAPABILITY_SIDE_SHEET_RADIUS,
  CAPABILITY_SIDE_SHEET_WIDTH_RATIO,
  getCapabilitySideSheetDuration,
  getCapabilitySideSheetTranslation,
  resolveCapabilitySideSheetGestureActivation,
  resolveCapabilitySideSheetSettle,
} from './capabilitySideSheetMotion';

describe('capability side sheet motion contract', () => {
  it('uses the accepted Option G geometry', () => {
    expect(CAPABILITY_SIDE_SHEET_WIDTH_RATIO).toBe(0.8);
    expect(CAPABILITY_SIDE_SHEET_RADIUS).toBe(44);
    expect(getCapabilitySideSheetTranslation(400, 1)).toBe(320);
    expect(getCapabilitySideSheetTranslation(400, 0.5)).toBe(160);
  });

  it('settles from progress unless a deliberate fling overrides it', () => {
    expect(resolveCapabilitySideSheetSettle({ progress: 0.6, velocityX: 0 })).toBe(true);
    expect(resolveCapabilitySideSheetSettle({ progress: 0.4, velocityX: 0 })).toBe(false);
    expect(resolveCapabilitySideSheetSettle({ progress: 0.2, velocityX: 700 })).toBe(true);
    expect(resolveCapabilitySideSheetSettle({ progress: 0.8, velocityX: -700 })).toBe(false);
  });

  it('replaces motion with an immediate state change when Reduce Motion is enabled', () => {
    expect(getCapabilitySideSheetDuration(false)).toBeGreaterThan(0);
    expect(getCapabilitySideSheetDuration(true)).toBe(0);
  });

  it('keeps one mounted pan recognizer inert until an open-sheet close gesture is deliberate', () => {
    expect(resolveCapabilitySideSheetGestureActivation({
      menuOpen: false,
      reduceMotion: false,
      translationX: -20,
      translationY: 0,
    })).toBe('fail');
    expect(resolveCapabilitySideSheetGestureActivation({
      menuOpen: true,
      reduceMotion: true,
      translationX: -20,
      translationY: 0,
    })).toBe('fail');
    expect(resolveCapabilitySideSheetGestureActivation({
      menuOpen: true,
      reduceMotion: false,
      translationX: -4,
      translationY: 2,
    })).toBe('wait');
    expect(resolveCapabilitySideSheetGestureActivation({
      menuOpen: true,
      reduceMotion: false,
      translationX: -12,
      translationY: 3,
    })).toBe('activate');
    expect(resolveCapabilitySideSheetGestureActivation({
      menuOpen: true,
      reduceMotion: false,
      translationX: -6,
      translationY: 18,
    })).toBe('fail');
  });
});
