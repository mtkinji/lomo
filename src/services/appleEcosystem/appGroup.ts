import { NativeModules, Platform } from 'react-native';

/**
 * IMPORTANT:
 * The WidgetKit extension reads glanceable state from a fixed App Group:
 *   group.com.andrewwatanabe.kwilt
 *
 * In dev builds the iOS bundle identifier may differ from production, but the
 * entitlements for App Groups are static. If we derive the group id from the
 * bundle id (e.g. group.<bundleId>), the app can end up writing to an App Group
 * the widget doesn't have access to, making the widget appear empty (often when
 * resizing triggers a fresh timeline read).
 */
export const KWILT_IOS_APP_GROUP_ID = 'group.com.andrewwatanabe.kwilt';

type KwiltAppGroupNativeModule = {
  setString: (key: string, value: string, appGroup: string) => Promise<void> | void;
  getString: (key: string, appGroup: string) => Promise<string | null> | string | null;
};

const native: KwiltAppGroupNativeModule | undefined = (NativeModules as any)?.KwiltAppGroup;

export async function setAppGroupString(key: string, value: string): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  if (!native?.setString) return false;
  try {
    await native.setString(key, value, KWILT_IOS_APP_GROUP_ID);
    return true;
  } catch {
    return false;
  }
}

export async function getAppGroupString(key: string): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  if (!native?.getString) return null;
  try {
    const value = await native.getString(key, KWILT_IOS_APP_GROUP_ID);
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}


