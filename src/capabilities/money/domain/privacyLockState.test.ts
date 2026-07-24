import { getMoneyPrivacyPresentation, shouldRequestMoneyUnlock } from './privacyLockState';

describe('Money privacy lock state', () => {
  it('covers snapshots while loading, backgrounded, or starting automatic unlock', () => {
    expect(getMoneyPrivacyPresentation({ loaded: false, covered: false, locked: false })).toBe('privacy-cover');
    expect(getMoneyPrivacyPresentation({ loaded: true, covered: true, locked: false })).toBe('privacy-cover');
    expect(getMoneyPrivacyPresentation({ loaded: true, covered: false, locked: true, automaticUnlockPending: true })).toBe('privacy-cover');
  });

  it('shows retry only after the automatic attempt and content only when unlocked', () => {
    expect(getMoneyPrivacyPresentation({ loaded: true, covered: false, locked: true })).toBe('unlock');
    expect(getMoneyPrivacyPresentation({ loaded: true, covered: false, locked: false })).toBe('content');
  });

  it('requests automatic unlock once for an uncovered lock', () => {
    expect(shouldRequestMoneyUnlock({ locked: true, covered: false, unlocking: false, attempted: false })).toBe(true);
    expect(shouldRequestMoneyUnlock({ locked: true, covered: false, unlocking: false, attempted: true })).toBe(false);
    expect(shouldRequestMoneyUnlock({ locked: true, covered: true, unlocking: false, attempted: false })).toBe(false);
  });
});
