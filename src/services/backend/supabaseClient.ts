import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getEnvVar, getSupabasePublishableKey } from '../../utils/getEnv';
import { SupabaseAuthStorage } from './supabaseAuthStorage';

let _client: SupabaseClient | null = null;
let _authStorage: SupabaseAuthStorage | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  // Use getEnvVar directly so this module remains backwards-compatible with
  // older bundles/caches that may not include newer helper exports yet.
  const url = getEnvVar<string>('supabaseUrl')?.trim();
  const key = getSupabasePublishableKey()?.trim();

  if (!url) {
    throw new Error('Missing Supabase URL (set extra.supabaseUrl / SUPABASE_URL)');
  }
  if (!key) {
    throw new Error('Missing Supabase publishable key (set extra.supabasePublishableKey)');
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


