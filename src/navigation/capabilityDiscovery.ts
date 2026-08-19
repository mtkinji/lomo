import type { CapabilityMenuDestinationId } from '../capabilities/types';

export type CapabilityDiscoveryState = {
  initialized: boolean;
  eligible: boolean;
  menuOpened: boolean;
  visitedCapabilityIds: CapabilityMenuDestinationId[];
};

export function createCapabilityDiscoveryState(): CapabilityDiscoveryState {
  return {
    initialized: false,
    eligible: false,
    menuOpened: false,
    visitedCapabilityIds: [],
  };
}

export function isExistingKwiltInstallation(
  storedMainAppState: string | null,
  storedInstallId: string | null = null,
): boolean {
  return storedMainAppState !== null || storedInstallId !== null;
}

export function initializeCapabilityDiscovery(
  state: CapabilityDiscoveryState,
  existingInstallation: boolean,
): CapabilityDiscoveryState {
  if (state.initialized) return state;
  return {
    ...state,
    initialized: true,
    eligible: !existingInstallation,
  };
}

export function markCapabilityDestinationVisited(
  state: CapabilityDiscoveryState,
  capabilityId: CapabilityMenuDestinationId,
): CapabilityDiscoveryState {
  if (state.visitedCapabilityIds.includes(capabilityId)) return state;
  return {
    ...state,
    visitedCapabilityIds: [...state.visitedCapabilityIds, capabilityId],
  };
}

export function markCapabilityMenuOpened(
  state: CapabilityDiscoveryState,
): CapabilityDiscoveryState {
  if (state.menuOpened) return state;
  return { ...state, menuOpened: true };
}

export function shouldShowCapabilityDiscoveryDot(
  state: CapabilityDiscoveryState,
  capabilityId: CapabilityMenuDestinationId,
): boolean {
  return state.initialized
    && state.eligible
    && !state.visitedCapabilityIds.includes(capabilityId);
}

export function shouldShowCapabilityMenuDiscoveryDot(
  state: CapabilityDiscoveryState,
): boolean {
  return state.initialized && state.eligible && !state.menuOpened;
}
