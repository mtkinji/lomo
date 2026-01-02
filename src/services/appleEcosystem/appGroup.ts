import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

const FALLBACK_BUNDLE_ID = 'com.andrewwatanabe.kwilt';
const bundleId = (Constants.expoConfig?.ios?.bundleIdentifier ??
  (Constants as any)?.manifest2?.extra?.expoClient?.ios?.bundleIdentifier ??
  FALLBACK_BUNDLE_ID) as string;

export const KWILT_IOS_APP_GROUP_ID = `group.${String(bundleId).trim() || FALLBACK_BUNDLE_ID}`;

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


