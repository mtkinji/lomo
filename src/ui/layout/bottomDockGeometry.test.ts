import { bottomDockGeometry } from '../../theme';
import {
  resolveDrawerActionBottomInset,
  resolveDrawerActionBottomPadding,
  resolveDrawerActionInlinePadding,
  resolvePhoneFloatingBottomInset,
} from './bottomDockGeometry';

describe('bottom dock geometry', () => {
  it('keeps a phone-floating dock optically nested with and without a home indicator', () => {
    expect(resolvePhoneFloatingBottomInset(0)).toBe(bottomDockGeometry.phoneFloating.minimumBottomGap);
    expect(resolvePhoneFloatingBottomInset(34)).toBe(21);
  });

  it('keeps a drawer action above the safe area without losing its minimum bottom gap', () => {
    expect(resolveDrawerActionBottomInset(0)).toBe(bottomDockGeometry.drawerAction.minimumBottomGap);
    expect(resolveDrawerActionBottomInset(34)).toBe(34);
  });

  it('resolves the visible drawer gap after the parent surface inset', () => {
    expect(resolveDrawerActionInlinePadding(16)).toBe(8);
    expect(resolveDrawerActionInlinePadding(0)).toBe(24);
    expect(resolveDrawerActionBottomPadding(34, 34)).toBe(0);
    expect(resolveDrawerActionBottomPadding(0, 34)).toBe(34);
    expect(resolveDrawerActionBottomPadding(0, 0)).toBe(20);
  });
});
