import { useEffect } from 'react';
import { useKwiltLabsStore } from '../../../labs/useKwiltLabsStore';
import { ExploreAlwaysOnRuntimeHost } from './ExploreAlwaysOnRuntimeHost';
import { stopExploreBackgroundUpdates } from './exploreLocationUpdates';
import { ExploreSyncRuntimeHost } from './ExploreSyncRuntimeHost';

export function ExploreLabsRuntimeHost({ userId }: { userId: string | null }) {
  const exploreEnabled = useKwiltLabsStore((state) => state.enabledCapabilities.includes('explore'));

  useEffect(() => {
    if (!exploreEnabled) {
      void stopExploreBackgroundUpdates().catch(() => undefined);
    }
  }, [exploreEnabled]);

  if (!userId || !exploreEnabled) return null;

  return (
    <>
      <ExploreAlwaysOnRuntimeHost />
      <ExploreSyncRuntimeHost userId={userId} />
    </>
  );
}
