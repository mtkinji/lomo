import React from 'react';

type ChromeSurface = string;
type ChromeVisibility = 'shown' | 'hidden';
type ChromeDirection = 'up' | 'down';

type ChromeVisibilityContextValue = {
  bottomBarVisible: boolean;
  bottomBarFadeVisible: boolean;
  setChromeAutoHideEnabled: (surface: ChromeSurface, enabled: boolean) => void;
  setChromeVisibility: (surface: ChromeSurface, visibility: ChromeVisibility) => void;
  notifyChromeScrollIntent: (surface: ChromeSurface, direction: ChromeDirection, delta: number) => void;
  setChromeInteractionLock: (surface: ChromeSurface, locked: boolean) => void;
  setChromeBottomFadeSuppressed: (surface: ChromeSurface, suppressed: boolean) => void;
};

const ChromeVisibilityContext = React.createContext<ChromeVisibilityContextValue | null>(null);

export function ChromeVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [bottomBarVisible, setBottomBarVisible] = React.useState(true);
  const [bottomFadeSuppressedSurfaces, setBottomFadeSuppressedSurfaces] = React.useState<Set<ChromeSurface>>(
    () => new Set(),
  );
  const autoHideSurfacesRef = React.useRef(new Set<ChromeSurface>());
  const lockedSurfacesRef = React.useRef(new Set<ChromeSurface>());

  const hasActiveAutoHideSurface = React.useCallback(() => autoHideSurfacesRef.current.size > 0, []);
  const isLocked = React.useCallback(() => lockedSurfacesRef.current.size > 0, []);

  const setChromeAutoHideEnabled = React.useCallback(
    (surface: ChromeSurface, enabled: boolean) => {
      if (enabled) {
        autoHideSurfacesRef.current.add(surface);
        return;
      }

      autoHideSurfacesRef.current.delete(surface);
      if (!hasActiveAutoHideSurface()) {
        setBottomBarVisible(true);
      }
    },
    [hasActiveAutoHideSurface],
  );

  const setChromeVisibility = React.useCallback(
    (_surface: ChromeSurface, visibility: ChromeVisibility) => {
      if (isLocked()) return;
      setBottomBarVisible(visibility === 'shown');
    },
    [isLocked],
  );

  const notifyChromeScrollIntent = React.useCallback(
    (surface: ChromeSurface, direction: ChromeDirection) => {
      if (!autoHideSurfacesRef.current.has(surface) || isLocked()) return;
      setBottomBarVisible(direction === 'up');
    },
    [isLocked],
  );

  const setChromeInteractionLock = React.useCallback((surface: ChromeSurface, locked: boolean) => {
    if (locked) {
      lockedSurfacesRef.current.add(surface);
      setBottomBarVisible(true);
      return;
    }

    lockedSurfacesRef.current.delete(surface);
  }, []);

  const setChromeBottomFadeSuppressed = React.useCallback((surface: ChromeSurface, suppressed: boolean) => {
    setBottomFadeSuppressedSurfaces((current) => {
      const next = new Set(current);
      if (suppressed) {
        next.add(surface);
      } else {
        next.delete(surface);
      }
      return next;
    });
  }, []);

  const value = React.useMemo<ChromeVisibilityContextValue>(
    () => ({
      bottomBarVisible,
      bottomBarFadeVisible: bottomFadeSuppressedSurfaces.size === 0,
      setChromeAutoHideEnabled,
      setChromeVisibility,
      notifyChromeScrollIntent,
      setChromeInteractionLock,
      setChromeBottomFadeSuppressed,
    }),
    [
      bottomFadeSuppressedSurfaces.size,
      bottomBarVisible,
      notifyChromeScrollIntent,
      setChromeAutoHideEnabled,
      setChromeBottomFadeSuppressed,
      setChromeInteractionLock,
      setChromeVisibility,
    ],
  );

  return (
    <ChromeVisibilityContext.Provider value={value}>
      {children}
    </ChromeVisibilityContext.Provider>
  );
}

export function useChromeVisibility() {
  const context = React.useContext(ChromeVisibilityContext);
  if (!context) {
    throw new Error('useChromeVisibility must be used inside ChromeVisibilityProvider');
  }
  return context;
}
