import { useEffect } from 'react';
import { existingInstallationAtStartup } from './capabilityDiscoveryStartup';
import { useCapabilityDiscoveryStore } from '../store/useCapabilityDiscoveryStore';

export function CapabilityDiscoveryRuntimeHost() {
  const hydrated = useCapabilityDiscoveryStore((state) => state.hydrated);
  const initialize = useCapabilityDiscoveryStore((state) => state.initialize);

  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    void existingInstallationAtStartup.then((existingInstallation) => {
      if (active) initialize(existingInstallation);
    });
    return () => {
      active = false;
    };
  }, [hydrated, initialize]);

  return null;
}
