import { getMoneyPrivacyPresentation, shouldRequestMoneyUnlock } from './privacyLockState';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('Money privacy lock state', () => {
  it('keeps unresolved settings visually quiet while covering real privacy transitions', () => {
    expect(getMoneyPrivacyPresentation({ loaded: false, covered: false, locked: false })).toBe('loading');
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

  it('does not revive the standalone blue Money brand cover for concealed states', () => {
    const gateSource = readFileSync(path.join(__dirname, '../runtime/MoneyPrivacyGate.tsx'), 'utf8');

    expect(gateSource).not.toContain('colors.quiltBlue700');
    expect(gateSource).not.toContain('<Logo');
  });
});
