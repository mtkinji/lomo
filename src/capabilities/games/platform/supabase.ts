export { getSupabaseClient as getGamesSupabaseClient } from '../../../services/backend/supabaseClient';

export async function flushAuthStorage() {
  // Kwilt owns and flushes the shared auth storage lifecycle.
}
