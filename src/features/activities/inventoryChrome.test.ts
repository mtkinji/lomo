import {
  INVENTORY_CHROME_FADE_CONTROL_GAP_PX,
  INVENTORY_CHROME_FADE_MAX_ALPHA,
  INVENTORY_CHROME_FADE_RAMP_DISTANCE_PX,
  doesQuickAddOwnInventoryBottomFade,
  getInventoryChromeDragStartEffect,
  getInventoryChromeScrollEffect,
  getInventoryChromeSettleEffect,
  getTopInventoryFadeGeometry,
} from './inventoryChrome';

describe('inventory chrome behavior', () => {
  it('does not hide on drag start before scroll direction is known', () => {
    expect(
      getInventoryChromeDragStartEffect({
        canAutoHide: true,
        locked: false,
      }),
    ).toBeNull();
  });

  it('does not hide when drag starts at the top of the list', () => {
    expect(
      getInventoryChromeDragStartEffect({
        canAutoHide: true,
        locked: false,
        y: 0,
      }),
    ).toEqual({ direction: 'up', visible: true });
  });

  it('does not hide when drag starts away from the top before scroll direction is known', () => {
    expect(
      getInventoryChromeDragStartEffect({
        canAutoHide: true,
        locked: false,
        y: 24,
      }),
    ).toBeNull();
  });

  it('does not hide on drag start when chrome is locked', () => {
    expect(
      getInventoryChromeDragStartEffect({
        canAutoHide: true,
        locked: true,
      }),
    ).toBeNull();
  });

  it('does not hide on tiny positive scroll deltas if drag-start did not already hide it', () => {
    expect(
      getInventoryChromeScrollEffect({
        y: 3,
        lastY: 0,
        canAutoHide: true,
        locked: false,
        upwardIntent: 0,
      }).effect,
    ).toBeNull();
  });

  it('hides after a 4px positive scroll delta if drag-start did not already hide it', () => {
    expect(
      getInventoryChromeScrollEffect({
        y: 4,
        lastY: 0,
        canAutoHide: true,
        locked: false,
        upwardIntent: 0,
      }).effect,
    ).toEqual({ direction: 'down', visible: false });
  });

  it('does not accumulate small positive momentum deltas as upward reveal intent', () => {
    let state = {
      lastY: 100,
      upwardIntent: 0,
    };

    for (const y of [102, 104, 106, 108, 110, 112, 114, 116, 118]) {
      const result = getInventoryChromeScrollEffect({
        y,
        lastY: state.lastY,
        canAutoHide: true,
        locked: false,
        upwardIntent: state.upwardIntent,
      });

      expect(result.scrollDirection).toBe('down');
      expect(result.effect).toBeNull();
      expect(result.upwardIntent).toBe(0);
      state = {
        lastY: result.lastY,
        upwardIntent: result.upwardIntent,
      };
    }
  });

  it('does not undo drag-start hide on the initial zero-offset scroll event', () => {
    expect(
      getInventoryChromeScrollEffect({
        y: 0,
        lastY: 0,
        canAutoHide: true,
        locked: false,
        upwardIntent: 0,
      }).effect,
    ).toBeNull();
  });

  it('reveals only after upward scroll crosses the reveal threshold', () => {
    const almost = getInventoryChromeScrollEffect({
      y: 34,
      lastY: 49,
      canAutoHide: true,
      locked: false,
      upwardIntent: 0,
    });
    expect(almost.effect).toBeNull();
    expect(almost.upwardIntent).toBe(15);

    const reveal = getInventoryChromeScrollEffect({
      y: 33,
      lastY: 49,
      canAutoHide: true,
      locked: false,
      upwardIntent: 0,
    });
    expect(reveal.effect).toEqual({ direction: 'up', visible: true });
    expect(reveal.upwardIntent).toBe(0);
  });

  it('does not reveal from upward jitter while downward momentum is settling', () => {
    const result = getInventoryChromeScrollEffect({
      y: 224,
      lastY: 241,
      canAutoHide: true,
      locked: false,
      allowReveal: false,
      upwardIntent: 0,
    });

    expect(result.scrollDirection).toBe('up');
    expect(result.effect).toBeNull();
    expect(result.upwardIntent).toBe(0);
  });

  it('still reveals from upward momentum when the user dragged upward first', () => {
    const result = getInventoryChromeScrollEffect({
      y: 224,
      lastY: 241,
      canAutoHide: true,
      locked: false,
      allowReveal: true,
      upwardIntent: 0,
    });

    expect(result.scrollDirection).toBe('up');
    expect(result.effect).toEqual({ direction: 'up', visible: true });
  });

  it('resets to visible at the exact top of the list', () => {
    expect(
      getInventoryChromeScrollEffect({
        y: 0,
        lastY: 12,
        canAutoHide: true,
        locked: false,
        upwardIntent: 0,
      }).effect,
    ).toEqual({ direction: 'up', visible: true });
  });

  it('resets to visible for sub-pixel top landings', () => {
    expect(
      getInventoryChromeScrollEffect({
        y: 0.5,
        lastY: 12,
        canAutoHide: true,
        locked: false,
        upwardIntent: 0,
      }).effect,
    ).toEqual({ direction: 'up', visible: true });
  });

  it('does not reveal from bottom overscroll settling back to the max offset', () => {
    const overscroll = getInventoryChromeScrollEffect({
      y: 640,
      lastY: 600,
      canAutoHide: true,
      locked: false,
      upwardIntent: 0,
      maxScrollY: 600,
    });
    expect(overscroll.effect).toBeNull();
    expect(overscroll.lastY).toBe(600);

    const settle = getInventoryChromeScrollEffect({
      y: 600,
      lastY: overscroll.lastY,
      canAutoHide: true,
      locked: false,
      upwardIntent: overscroll.upwardIntent,
      maxScrollY: 600,
    });
    expect(settle.effect).toBeNull();
    expect(settle.upwardIntent).toBe(0);
  });

  it('does not reveal from a missing momentum settle offset after scrolling down', () => {
    expect(
      getInventoryChromeSettleEffect({
        lastY: 240,
        canAutoHide: true,
        locked: false,
      }),
    ).toEqual({
      lastY: 240,
      upwardIntent: 0,
      effect: null,
    });
  });

  it('does not reveal from a stray near-top settle offset when the scroll stream is still mid-list', () => {
    expect(
      getInventoryChromeSettleEffect({
        y: 0,
        lastY: 240,
        canAutoHide: true,
        locked: false,
      }),
    ).toEqual({
      lastY: 0,
      upwardIntent: 0,
      effect: null,
    });
  });

  it('confirms chrome visible when momentum settles after the scroll stream reached the top', () => {
    expect(
      getInventoryChromeSettleEffect({
        y: 0.5,
        lastY: 0.5,
        canAutoHide: true,
        locked: false,
      }),
    ).toEqual({
      lastY: 0,
      upwardIntent: 0,
      effect: { direction: 'up', visible: true },
    });
  });

  it('does not change chrome when momentum settles while chrome is locked', () => {
    expect(
      getInventoryChromeSettleEffect({
        y: 0,
        lastY: 0,
        canAutoHide: true,
        locked: true,
      }).effect,
    ).toBeNull();
  });

  it('uses toolbar visual height, not padded container height, for the top fade boundary', () => {
    const geometry = getTopInventoryFadeGeometry({
      safeAreaTop: 47,
      toolbarVisualHeight: 44,
      toolbarContainerHeight: 78,
      controlGap: 6,
      rampDistance: 6,
    });

    expect(geometry.strongHeight).toBe(97);
    expect(geometry.height).toBe(103);
    expect(geometry.rampStart).toBeCloseTo(97 / 103);
    expect(geometry.listOverlapHeight).toBe(90);
  });

  it('keeps top and bottom local-control fades on the same visual contract', () => {
    expect(INVENTORY_CHROME_FADE_CONTROL_GAP_PX).toBe(6);
    expect(INVENTORY_CHROME_FADE_RAMP_DISTANCE_PX).toBe(6);
    expect(INVENTORY_CHROME_FADE_MAX_ALPHA).toBeCloseTo(0.92);
  });

  it('lets the quick-add dock own the To-dos list bottom fade', () => {
    expect(doesQuickAddOwnInventoryBottomFade({ isKanbanLayout: false })).toBe(true);
    expect(doesQuickAddOwnInventoryBottomFade({ isKanbanLayout: true })).toBe(false);
  });
});
