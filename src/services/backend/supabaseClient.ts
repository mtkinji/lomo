import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublishableKey, getSupabaseUrl } from '../../utils/getEnv';
import { SupabaseAuthStorage } from './supabaseAuthStorage';

let _client: SupabaseClient | null = null;
let _authStorage: SupabaseAuthStorage | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = getSupabaseUrl()?.trim();
  const key = getSupabasePublishableKey()?.trim();

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
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });

  return _client;
}


