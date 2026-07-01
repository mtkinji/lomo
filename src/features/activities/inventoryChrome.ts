export const INVENTORY_CHROME_HIDE_DELTA = 4;
export const INVENTORY_CHROME_REVEAL_DELTA = 16;
export const INVENTORY_CHROME_TOP_REVEAL_THRESHOLD_PX = 0.5;
export const INVENTORY_CHROME_FADE_CONTROL_GAP_PX = 6;
export const INVENTORY_CHROME_FADE_RAMP_DISTANCE_PX = 6;
export const INVENTORY_CHROME_FADE_MAX_ALPHA = 0.92;
export const INVENTORY_CHROME_TOOLBAR_VISUAL_FALLBACK_PX = 44;

export type InventoryChromeEffect = {
  direction: 'up' | 'down';
  visible: boolean;
};

export function getInventoryChromeDragStartEffect({
  canAutoHide,
  locked,
  y = Number.POSITIVE_INFINITY,
  topRevealThreshold = INVENTORY_CHROME_TOP_REVEAL_THRESHOLD_PX,
}: {
  canAutoHide: boolean;
  locked: boolean;
  y?: number;
  topRevealThreshold?: number;
}): InventoryChromeEffect | null {
  if (!canAutoHide || locked) return null;
  if (y <= topRevealThreshold) return { direction: 'up', visible: true };
  return null;
}

export function getInventoryChromeScrollEffect({
  y,
  lastY,
  canAutoHide,
  locked,
  allowReveal = true,
  upwardIntent = 0,
  revealDelta = INVENTORY_CHROME_REVEAL_DELTA,
  maxScrollY = Number.POSITIVE_INFINITY,
  topRevealThreshold = INVENTORY_CHROME_TOP_REVEAL_THRESHOLD_PX,
}: {
  y: number;
  lastY: number;
  canAutoHide: boolean;
  locked: boolean;
  allowReveal?: boolean;
  upwardIntent?: number;
  revealDelta?: number;
  maxScrollY?: number;
  topRevealThreshold?: number;
}): {
  lastY: number;
  downwardIntent: number;
  upwardIntent: number;
  scrollDirection: 'up' | 'down' | null;
  effect: InventoryChromeEffect | null;
} {
  const scrollMax = Number.isFinite(maxScrollY) ? Math.max(0, maxScrollY) : Number.POSITIVE_INFINITY;
  const nextY = Math.min(scrollMax, Math.max(0, y));
  const atTop = nextY <= topRevealThreshold;

  if (!canAutoHide || locked) {
    return {
      lastY: nextY,
      downwardIntent: 0,
      upwardIntent,
      scrollDirection: null,
      effect: null,
    };
  }

  if (atTop && lastY <= topRevealThreshold) {
    return {
      lastY: 0,
      downwardIntent: 0,
      upwardIntent,
      scrollDirection: null,
      effect: null,
    };
  }

  if (atTop) {
    return {
      lastY: 0,
      downwardIntent: 0,
      upwardIntent: 0,
      scrollDirection: 'up',
      effect: { direction: 'up', visible: true },
    };
  }

  const delta = nextY - lastY;

  if (delta >= INVENTORY_CHROME_HIDE_DELTA) {
    return {
      lastY: nextY,
      downwardIntent: 0,
      upwardIntent: 0,
      scrollDirection: 'down',
      effect: { direction: 'down', visible: false },
    };
  }

  if (Math.abs(delta) < 1) {
    return {
      lastY: nextY,
      downwardIntent: 0,
      upwardIntent,
      scrollDirection: null,
      effect: null,
    };
  }

  if (delta > 0) {
    return {
      lastY: nextY,
      downwardIntent: 0,
      upwardIntent: 0,
      scrollDirection: 'down',
      effect: null,
    };
  }

  if (delta < 0 && !allowReveal) {
    return {
      lastY: nextY,
      downwardIntent: 0,
      upwardIntent: 0,
      scrollDirection: 'up',
      effect: null,
    };
  }

  const nextUpwardIntent = upwardIntent + Math.abs(delta);
  const shouldReveal = nextUpwardIntent >= revealDelta;

  return {
    lastY: nextY,
    downwardIntent: 0,
    upwardIntent: shouldReveal ? 0 : nextUpwardIntent,
    scrollDirection: delta < 0 ? 'up' : null,
    effect: shouldReveal ? { direction: 'up', visible: true } : null,
  };
}

export function getInventoryChromeSettleEffect({
  y,
  lastY,
  canAutoHide,
  locked,
  topRevealThreshold = INVENTORY_CHROME_TOP_REVEAL_THRESHOLD_PX,
}: {
  y?: number;
  lastY: number;
  canAutoHide: boolean;
  locked: boolean;
  topRevealThreshold?: number;
}): {
  lastY: number;
  upwardIntent: number;
  effect: InventoryChromeEffect | null;
} {
  if (!canAutoHide || locked || typeof y !== 'number' || !Number.isFinite(y)) {
    return {
      lastY,
      upwardIntent: 0,
      effect: null,
    };
  }

  const nextY = Math.max(0, y);
  const settledAtTop = nextY <= topRevealThreshold && lastY <= topRevealThreshold;

  return {
    lastY: settledAtTop ? 0 : nextY,
    upwardIntent: 0,
    effect: settledAtTop ? { direction: 'up', visible: true } : null,
  };
}

export function getTopInventoryFadeGeometry({
  safeAreaTop,
  toolbarVisualHeight,
  toolbarContainerHeight,
  controlGap = INVENTORY_CHROME_FADE_CONTROL_GAP_PX,
  rampDistance = INVENTORY_CHROME_FADE_RAMP_DISTANCE_PX,
}: {
  safeAreaTop: number;
  toolbarVisualHeight: number;
  toolbarContainerHeight: number;
  controlGap?: number;
  rampDistance?: number;
}): {
  strongHeight: number;
  height: number;
  listOverlapHeight: number;
  rampStart: number;
} {
  const strongHeight = Math.max(safeAreaTop + toolbarVisualHeight + controlGap, 1);
  const height = Math.max(strongHeight + rampDistance, 1);
  const listOverlapHeight = Math.max(toolbarContainerHeight + controlGap + rampDistance, 1);
  const rampStart = Math.max(0, Math.min(1, strongHeight / height));

  return {
    strongHeight,
    height,
    listOverlapHeight,
    rampStart,
  };
}

export function doesQuickAddOwnInventoryBottomFade({
  isKanbanLayout,
}: {
  isKanbanLayout: boolean;
}): boolean {
  return !isKanbanLayout;
}
