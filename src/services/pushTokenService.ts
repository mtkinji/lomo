/**
 * Push token registration for server-initiated notifications (e.g., MCP digest).
 *
 * This registers the Expo push token with the Kwilt backend so the MCP server
 * can send push notifications when activities/goals are created externally.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { getSupabaseClient } from './backend/supabaseClient';
import { getAccessToken } from './backend/auth';

let registrationInFlight = false;
let lastRegisteredToken: string | null = null;

/**
 * Get the Expo push token for this device.
 * Returns null if push notifications aren't available.
 */
async function getExpoPushToken(): Promise<string | null> {
  try {
    // Check if we have permission
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    // Get the project ID from Expo config
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants.manifest2 as any)?.extra?.eas?.projectId ??
      null;

    if (!projectId) {
      console.warn('[PushToken] No EAS project ID found, cannot get push token');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (e) {
    console.warn('[PushToken] Failed to get push token:', e);
    return null;
  }
}

/**
 * Register the device's push token with the Kwilt backend.
 * Should be called after the user signs in and grants notification permissions.
 */
export async function registerPushToken(): Promise<void> {
  if (registrationInFlight) return;

  const accessToken = await getAccessToken();
  if (!accessToken) {
    // Not signed in, skip
    return;
  }

  const pushToken = await getExpoPushToken();
  if (!pushToken) {
    // No push token available
    return;
  }

  // Skip if already registered this token
  if (pushToken === lastRegisteredToken) {
    return;
  }

  registrationInFlight = true;
  try {
    const supabase = getSupabaseClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) {
      return;
    }

    // Upsert the token (user_id + token is unique)
    const { error } = await supabase
      .from('kwilt_push_tokens')
      .upsert(
        {
          user_id: userId,
          token: pushToken,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,token' }
      );

    if (error) {
      console.warn('[PushToken] Failed to register token:', error.message);
      return;
    }

    lastRegisteredToken = pushToken;
    console.log('[PushToken] Registered push token successfully');
  } catch (e) {
    console.warn('[PushToken] Registration error:', e);
  } finally {
    registrationInFlight = false;
  }
}

/**
 * Remove the push token from the backend (e.g., on sign out).
 */
export async function unregisterPushToken(): Promise<void> {
  if (!lastRegisteredToken) return;

  try {
    const supabase = getSupabaseClient();
    await supabase
      .from('kwilt_push_tokens')
      .delete()
      .eq('token', lastRegisteredToken);

    lastRegisteredToken = null;
  } catch (e) {
    console.warn('[PushToken] Failed to unregister token:', e);
  }
}



