import { NativeModules, Platform } from 'react-native';
import type { Activity } from '../../domain/types';

type KwiltSpotlightNativeModule = {
  indexActivitiesJson: (json: string) => Promise<void> | void;
  clearActivities: () => Promise<void> | void;
};

const native: KwiltSpotlightNativeModule | undefined = (NativeModules as any)?.KwiltSpotlight;

export async function indexActivitiesForSpotlight(activities: Activity[]): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  if (!native?.indexActivitiesJson) return false;

  // v1 policy: index only IDs + titles (no notes), and cap the payload.
  const payload = activities
    .filter((a) => a.status !== 'cancelled')
    .slice(0, 200)
    .map((a) => ({ id: a.id, title: a.title }));

  try {
    await native.indexActivitiesJson(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export async function clearSpotlightActivities(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  if (!native?.clearActivities) return false;
  try {
    await native.clearActivities();
    return true;
  } catch {
    return false;
  }
}


