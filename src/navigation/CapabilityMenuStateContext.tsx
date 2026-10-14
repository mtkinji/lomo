import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useLayoutEffect,
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
type MenuMotion = (open: boolean) => void;
const CapabilityMenuMotionContext = createContext<((motion: MenuMotion) => () => void) | null>(null);

export function CapabilityMenuStateProvider({
  children,
  onMenuOpened,
}: {
  children: ReactNode;
  onMenuOpened?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuOpenRef = useRef(false);
  const motionRef = useRef<MenuMotion | null>(null);

  const registerMotion = useCallback((motion: MenuMotion) => {
    motionRef.current = motion;
    motion(menuOpenRef.current);
    return () => {
      if (motionRef.current === motion) motionRef.current = null;
    };
  }, []);

  const openMenu = useCallback(() => {
    if (menuOpenRef.current) return;
    menuOpenRef.current = true;
    // Schedule UI-thread motion before React renders the menu or runs bookkeeping.
    motionRef.current?.(true);
    setMenuOpen(true);
    void HapticsService.trigger('shell.nav.open');
    onMenuOpened?.();
  }, [onMenuOpened]);

  const coverMenu = useCallback(() => {
    if (!menuOpenRef.current) return;
    menuOpenRef.current = false;
    motionRef.current?.(false);
    setMenuOpen(false);
    void HapticsService.trigger('shell.nav.close');
  }, []);

  const actions = useMemo(() => ({ openMenu, coverMenu }), [coverMenu, openMenu]);

  return (
    <CapabilityMenuActionsContext.Provider value={actions}>
      <CapabilityMenuOpenContext.Provider value={menuOpen}>
        <CapabilityMenuMotionContext.Provider value={registerMotion}>
          {children}
        </CapabilityMenuMotionContext.Provider>
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

/** Register the shell's animation driver without subscribing screens to motion state. */
export function useCapabilityMenuMotion(motion: MenuMotion): void {
  const registerMotion = useContext(CapabilityMenuMotionContext);
  if (!registerMotion) {
    throw new Error('useCapabilityMenuMotion must be used within CapabilityMenuStateProvider');
  }
  useLayoutEffect(() => registerMotion(motion), [motion, registerMotion]);
}
