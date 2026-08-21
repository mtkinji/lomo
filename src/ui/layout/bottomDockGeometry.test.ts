import { bottomDockGeometry } from '../../theme';
import {
  resolveDrawerActionBottomInset,
  resolveDrawerActionBottomPadding,
  resolveDrawerActionInlinePadding,
  resolveDrawerFloatingActionBottomInset,
  resolveDrawerFloatingActionInlinePadding,
  resolvePhoneFloatingBottomInset,
  resolvePhoneFloatingActionContentInset,
} from './bottomDockGeometry';

describe('bottom dock geometry', () => {
  it('keeps a phone-floating dock optically nested with and without a home indicator', () => {
    expect(resolvePhoneFloatingBottomInset(0)).toBe(bottomDockGeometry.phoneFloating.minimumBottomGap);
    expect(resolvePhoneFloatingBottomInset(34)).toBe(21);
  });

  it('reserves scroll clearance from the same phone-floating geometry', () => {
    expect(resolvePhoneFloatingActionContentInset(34, 52)).toBe(85);
    expect(resolvePhoneFloatingActionContentInset(0, 52)).toBe(84);
  });

  it('keeps a drawer action above the safe area without losing its minimum bottom gap', () => {
    expect(resolveDrawerActionBottomInset(0)).toBe(bottomDockGeometry.drawerAction.minimumBottomGap);
    expect(resolveDrawerActionBottomInset(34)).toBe(34);
  });

  it('resolves the visible drawer gap after the parent surface inset', () => {
    expect(resolveDrawerActionInlinePadding(16)).toBe(8);
    expect(resolveDrawerActionInlinePadding(0)).toBe(24);
    expect(resolveDrawerFloatingActionInlinePadding(16)).toBe(16);
    expect(resolveDrawerFloatingActionInlinePadding(0)).toBe(32);
    expect(resolveDrawerFloatingActionBottomInset(34)).toBe(32);
    expect(resolveDrawerFloatingActionBottomInset(0)).toBe(32);
    expect(resolveDrawerActionBottomPadding(34, 34)).toBe(0);
    expect(resolveDrawerActionBottomPadding(0, 34)).toBe(34);
    expect(resolveDrawerActionBottomPadding(0, 0)).toBe(20);
  });
});
