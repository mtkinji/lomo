import type { Session } from '@supabase/supabase-js';
import {
  signInWithProvider as signInWithKwiltProvider,
} from '../../../services/backend/auth';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';

export type AuthProviderName = 'apple' | 'google';

export function permanentUserId(session: Session | null | undefined) {
  return session?.user.is_anonymous ? null : session?.user.id ?? null;
}

export function signInWithProvider(provider: AuthProviderName) {
  return signInWithKwiltProvider(provider);
}

export async function signOut() {
  await getSupabaseClient().auth.signOut();
}
