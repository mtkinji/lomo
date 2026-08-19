import type { CapabilityMenuDestinationId } from '../capabilities/types';
import {
  createCapabilityDiscoveryState,
  initializeCapabilityDiscovery,
  isExistingKwiltInstallation,
  markCapabilityDestinationVisited,
  markCapabilityMenuOpened,
  shouldShowCapabilityDiscoveryDot,
  shouldShowCapabilityMenuDiscoveryDot,
} from './capabilityDiscovery';

const destination = 'todos' as CapabilityMenuDestinationId;

describe('capability discovery', () => {
  it('treats either pre-existing install marker as an existing installation', () => {
    expect(isExistingKwiltInstallation(null)).toBe(false);
    expect(isExistingKwiltInstallation('{"state":{}}')).toBe(true);
    expect(isExistingKwiltInstallation('corrupt-but-present')).toBe(true);
    expect(isExistingKwiltInstallation(null, 'install-1')).toBe(true);
  });

  it('enables one-time destination discovery only for a fresh installation', () => {
    const fresh = initializeCapabilityDiscovery(createCapabilityDiscoveryState(), false);
    const existing = initializeCapabilityDiscovery(createCapabilityDiscoveryState(), true);

    expect(shouldShowCapabilityDiscoveryDot(fresh, destination)).toBe(true);
    expect(shouldShowCapabilityMenuDiscoveryDot(fresh)).toBe(true);
    expect(shouldShowCapabilityDiscoveryDot(existing, destination)).toBe(false);
    expect(shouldShowCapabilityMenuDiscoveryDot(existing)).toBe(false);
  });

  it('keeps an active destination visited when focus arrives before initialization', () => {
    const focused = markCapabilityDestinationVisited(createCapabilityDiscoveryState(), destination);
    const initialized = initializeCapabilityDiscovery(focused, false);

    expect(shouldShowCapabilityDiscoveryDot(initialized, destination)).toBe(false);
    expect(shouldShowCapabilityDiscoveryDot(initialized, 'goals')).toBe(true);
  });

  it('clears the menu-opener dot after the menu opens without clearing destination dots', () => {
    const fresh = initializeCapabilityDiscovery(createCapabilityDiscoveryState(), false);
    const opened = markCapabilityMenuOpened(fresh);

    expect(shouldShowCapabilityMenuDiscoveryDot(opened)).toBe(false);
    expect(shouldShowCapabilityDiscoveryDot(opened, destination)).toBe(true);
  });

  it('never resets visited state when initialization runs again after an app update', () => {
    const fresh = initializeCapabilityDiscovery(createCapabilityDiscoveryState(), false);
    const visited = markCapabilityDestinationVisited(fresh, destination);
    const reopenedAfterUpdate = initializeCapabilityDiscovery(visited, false);

    expect(reopenedAfterUpdate).toBe(visited);
    expect(shouldShowCapabilityDiscoveryDot(reopenedAfterUpdate, destination)).toBe(false);
  });
});
