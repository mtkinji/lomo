import { NativeModules, Platform } from 'react-native';
import type { Activity } from '../../domain/types';

type KwiltSpotlightNativeModule = {
  indexActivitiesJson: (json: string) => Promise<void> | void;
  clearActivities: () => Promise<void> | void;
};

const native: KwiltSpotlightNativeModule | undefined = (NativeModules as any)?.KwiltSpotlight;

let lastIndexedJson: string | null = null;
let indexQueue: Promise<unknown> = Promise.resolve();
function enqueueIndexOperation(operation: () => Promise<boolean>): Promise<boolean> {
  const next = indexQueue.then(operation);
  indexQueue = next.catch(() => undefined);
  return next;
}

export async function indexActivitiesForSpotlight(activities: Activity[]): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  if (!native?.indexActivitiesJson) return false;

  // v1 policy: index only IDs + titles (no notes), and cap the payload.
  const payload = activities
    .filter((a) => a.status !== 'cancelled')
    .slice(0, 200)
    .map((a) => ({ id: a.id, title: a.title }));

  const json = JSON.stringify(payload);
  return enqueueIndexOperation(async () => {
    if (lastIndexedJson === json) return true;
    lastIndexedJson = null;
    try {
      await native.indexActivitiesJson(json);
      lastIndexedJson = json;
      return true;
    } catch { return false; }
  });
}

export async function clearSpotlightActivities(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  if (!native?.clearActivities) return false;
  return enqueueIndexOperation(async () => {
    lastIndexedJson = null;
    try {
      await native.clearActivities();
      return true;
    } catch { return false; }
  });
}


