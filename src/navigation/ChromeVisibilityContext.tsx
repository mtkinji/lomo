import React from 'react';

type ChromeSurface = string;
type ChromeVisibility = 'shown' | 'hidden';
type ChromeDirection = 'up' | 'down';

type ChromeVisibilityContextValue = {
  bottomBarVisible: boolean;
  setChromeAutoHideEnabled: (surface: ChromeSurface, enabled: boolean) => void;
  setChromeVisibility: (surface: ChromeSurface, visibility: ChromeVisibility) => void;
  notifyChromeScrollIntent: (surface: ChromeSurface, direction: ChromeDirection, delta: number) => void;
  setChromeInteractionLock: (surface: ChromeSurface, locked: boolean) => void;
};

const ChromeVisibilityContext = React.createContext<ChromeVisibilityContextValue | null>(null);

export function ChromeVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [bottomBarVisible, setBottomBarVisible] = React.useState(true);
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

  const value = React.useMemo<ChromeVisibilityContextValue>(
    () => ({
      bottomBarVisible,
      setChromeAutoHideEnabled,
      setChromeVisibility,
      notifyChromeScrollIntent,
      setChromeInteractionLock,
    }),
    [
      bottomBarVisible,
      notifyChromeScrollIntent,
      setChromeAutoHideEnabled,
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
