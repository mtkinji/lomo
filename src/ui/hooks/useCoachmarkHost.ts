import { useEffect, useMemo, useRef, useState } from 'react';

export type CoachmarkScrollTo = (args: { y: number; animated?: boolean }) => void;

type UseCoachmarkHostArgs = {
  /**
   * Whether the guidance step is logically active (the caller wants to show a coachmark
   * once the target is positioned).
   */
  active: boolean;
  /**
   * Optional best-effort scroll function for the owning scroll container.
   * When provided alongside `targetScrollY`, the hook will scroll first, then allow
   * the coachmark to appear.
   */
  scrollTo?: CoachmarkScrollTo;
  /**
   * Content-space Y offset to scroll to before showing the coachmark.
   * Provide a value that places the target comfortably on-screen (e.g. `targetY - 120`).
   */
  targetScrollY?: number | null;
  /**
   * Optional key that represents which step/target is active. When this changes while active,
   * the hook will treat it as a new target and re-run positioning.
   */
  stepKey?: string | number;
};

type UseCoachmarkHostResult = {
  /**
   * Whether the coachmark should be rendered now (after any auto-scroll positioning).
   */
  coachmarkVisible: boolean;
  /**
   * Whether the owning scroll container should allow scrolling. Default policy: lock scrolling
   * while the coachmark is visible.
   */
  scrollEnabled: boolean;
  /**
   * Bump this to re-measure coachmark placement once after layout/scroll settles.
   * Pass through to `<Coachmark remeasureKey={...} />`.
   */
  remeasureKey: number;
};

/**
 * Shared helper for the “stable coachmark contract”:
 * - best-effort auto-scroll the target into view (if configured)
 * - lock scrolling while the coachmark is visible
 * - trigger a one-shot Coachmark re-measure after scroll settles
 */
export function useCoachmarkHost({
  active,
  scrollTo,
  targetScrollY,
  stepKey,
}: UseCoachmarkHostArgs): UseCoachmarkHostResult {
  const [isPositioned, setIsPositioned] = useState(false);
  const [remeasureKey, setRemeasureKey] = useState(0);
  const positioningRunIdRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setIsPositioned(false);
      return;
    }

    const runId = (positioningRunIdRef.current += 1);
    setIsPositioned(false);

    const y =
      typeof targetScrollY === 'number' && Number.isFinite(targetScrollY)
        ? Math.max(0, targetScrollY)
        : null;

    if (scrollTo && y != null) {
      scrollTo({ y, animated: true });
    }

    // Let the scroll/layout settle for at least a frame, then show + re-measure once.
    let raf2: number | null = null;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (positioningRunIdRef.current !== runId) return;
        setRemeasureKey((k) => k + 1);
        setIsPositioned(true);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2 != null) cancelAnimationFrame(raf2);
    };
    // stepKey is intentionally part of positioning semantics.
  }, [active, scrollTo, targetScrollY, stepKey]);

  const coachmarkVisible = active && isPositioned;
  const scrollEnabled = !coachmarkVisible;

  return useMemo(
    () => ({
      coachmarkVisible,
      scrollEnabled,
      remeasureKey,
    }),
    [coachmarkVisible, remeasureKey, scrollEnabled],
  );
}


