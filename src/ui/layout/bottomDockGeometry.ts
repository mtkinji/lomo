import { bottomDockGeometry } from '../../theme';

export function resolvePhoneFloatingBottomInset(safeAreaBottom: number): number {
  const safeAreaAwareInset = Math.round(
    safeAreaBottom * bottomDockGeometry.phoneFloating.safeAreaLiftRatio,
  ) + bottomDockGeometry.phoneFloating.safeAreaBottomAdjustment;

  return Math.max(bottomDockGeometry.phoneFloating.minimumBottomGap, safeAreaAwareInset);
}

export function resolvePhoneFloatingActionContentInset(
  safeAreaBottom: number,
  actionHeight: number,
): number {
  return (
    resolvePhoneFloatingBottomInset(safeAreaBottom)
    + actionHeight
    + bottomDockGeometry.phoneFloating.contentGap
  );
}

export function resolveRestingFloatingControlContentInset(actionHeight: number): number {
  return (
    bottomDockGeometry.restingFloatingControl.bottomGap
    + actionHeight
    + bottomDockGeometry.restingFloatingControl.contentGap
  );
}

export function resolveDrawerActionBottomInset(safeAreaBottom: number): number {
  return Math.max(bottomDockGeometry.drawerAction.minimumBottomGap, safeAreaBottom);
}

export function resolveDrawerActionInlinePadding(parentInlineInset: number): number {
  return Math.max(0, bottomDockGeometry.drawerAction.inlineGap - parentInlineInset);
}

export function resolveDrawerFloatingActionInlinePadding(parentInlineInset: number): number {
  return Math.max(0, bottomDockGeometry.drawerFloatingAction.inlineGap - parentInlineInset);
}

export function resolveDrawerFloatingActionBottomInset(safeAreaBottom: number): number {
  return Math.max(
    bottomDockGeometry.drawerFloatingAction.bottomGap,
    resolvePhoneFloatingBottomInset(safeAreaBottom),
  );
}

export function resolveDrawerFloatingActionContentInset(
  safeAreaBottom: number,
  actionHeight: number,
): number {
  return (
    resolveDrawerFloatingActionBottomInset(safeAreaBottom)
    + actionHeight
    + bottomDockGeometry.drawerFloatingAction.contentGap
  );
}

export function resolveDrawerActionBottomPadding(
  parentBottomInset: number,
  safeAreaBottom: number,
): number {
  return Math.max(0, resolveDrawerActionBottomInset(safeAreaBottom) - parentBottomInset);
}
