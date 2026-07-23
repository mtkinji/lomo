import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { HapticsService } from '../services/HapticsService';

type CapabilityMenuState = {
  menuOpen: boolean;
  openMenu: () => void;
  coverMenu: () => void;
};

type CapabilityMenuActions = Pick<CapabilityMenuState, 'openMenu' | 'coverMenu'>;

const CapabilityMenuActionsContext = createContext<CapabilityMenuActions | null>(null);
const CapabilityMenuOpenContext = createContext<boolean | null>(null);

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
      void HapticsService.trigger('shell.nav.open');
      onMenuOpened?.();
      return true;
    });
  }, [onMenuOpened]);

  const coverMenu = useCallback(() => {
    setMenuOpen((current) => {
      if (!current) return current;
      void HapticsService.trigger('shell.nav.close');
      return false;
    });
  }, []);

  const actions = useMemo(() => ({ openMenu, coverMenu }), [coverMenu, openMenu]);

  return (
    <CapabilityMenuActionsContext.Provider value={actions}>
      <CapabilityMenuOpenContext.Provider value={menuOpen}>
        {children}
      </CapabilityMenuOpenContext.Provider>
    </CapabilityMenuActionsContext.Provider>
  );
}

export function useCapabilityMenuActions(): CapabilityMenuActions {
  const value = useContext(CapabilityMenuActionsContext);
  if (!value) {
    throw new Error('useCapabilityMenuActions must be used within CapabilityMenuStateProvider');
  }
  return value;
}

export function useCapabilityMenuOpen(): boolean {
  const value = useContext(CapabilityMenuOpenContext);
  if (value === null) {
    throw new Error('useCapabilityMenuOpen must be used within CapabilityMenuStateProvider');
  }
  return value;
}

export function useCapabilityMenuState(): CapabilityMenuState {
  const menuOpen = useCapabilityMenuOpen();
  const actions = useCapabilityMenuActions();
  return useMemo(() => ({ menuOpen, ...actions }), [actions, menuOpen]);
}
