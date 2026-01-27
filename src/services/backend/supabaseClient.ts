import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { getSupabasePublishableKey, getSupabaseUrl } from '../../utils/getEnv';
import { SupabaseAuthStorage } from './supabaseAuthStorage';

let _client: SupabaseClient | null = null;
let _authStorage: SupabaseAuthStorage | null = null;

export async function flushSupabaseAuthStorage(): Promise<void> {
  try {
    await _authStorage?.flush();
  } catch {
    // best-effort
  }
}

export async function resetSupabaseAuthStorage(): Promise<void> {
  try {
    if (!_authStorage) {
      _authStorage = new SupabaseAuthStorage();
    }
    await _authStorage.clearAuthSessionKeys();
  } catch {
    // best-effort
  }
}

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = getSupabaseUrl()?.trim();
  const key = getSupabasePublishableKey()?.trim();
  const isExpoGo = Constants.appOwnership === 'expo';

  if (!url) {
    throw new Error(
      'Missing Supabase URL (set extra.supabaseUrl / SUPABASE_URL / EXPO_PUBLIC_SUPABASE_URL)'
    );
  }
  if (!key) {
    throw new Error(
      'Missing Supabase publishable key (set extra.supabasePublishableKey / SUPABASE_ANON_KEY / EXPO_PUBLIC_SUPABASE_ANON_KEY)'
    );
  }

  if (!_authStorage) {
    _authStorage = new SupabaseAuthStorage();
  }

  _client = createClient(url, key, {
    auth: {
      storage: _authStorage as any,
      // Explicit storage key so sessions survive across reloads and don't depend on
      // URL parsing (custom domains, trailing slashes, etc.).
      storageKey: 'kwilt.supabase.auth',
      persistSession: true,
      // Expo Go is notably fragile around backgrounding/suspension during OAuth and reloads.
      // Disable auto-refresh in Expo Go and in __DEV__ to avoid repeated "Invalid Refresh Token"
      // runtime error banners when the simulator has stale auth state. We refresh explicitly at
      // the points we require auth (see `ensureSignedInWithPrompt`).
      autoRefreshToken: !isExpoGo && !__DEV__,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });

  return _client;
}


