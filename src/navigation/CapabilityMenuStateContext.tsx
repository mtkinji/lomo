import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type CapabilityMenuState = {
  menuOpen: boolean;
  openMenu: () => void;
  coverMenu: () => void;
};

const CapabilityMenuStateContext = createContext<CapabilityMenuState | null>(null);

export function CapabilityMenuStateProvider({
  children,
  onMenuOpened,
}: {
  children: ReactNode;
  onMenuOpened?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const openMenu = useCallback(() => {
    setMenuOpen((current) => {
      if (current) return current;
      onMenuOpened?.();
      return true;
    });
  }, [onMenuOpened]);

  const coverMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const value = useMemo(
    () => ({ menuOpen, openMenu, coverMenu }),
    [coverMenu, menuOpen, openMenu],
  );

  return (
    <CapabilityMenuStateContext.Provider value={value}>
      {children}
    </CapabilityMenuStateContext.Provider>
  );
}

export function useCapabilityMenuState(): CapabilityMenuState {
  const value = useContext(CapabilityMenuStateContext);
  if (!value) {
    throw new Error('useCapabilityMenuState must be used within CapabilityMenuStateProvider');
  }
  return value;
}
